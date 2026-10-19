using System;
using System.IO;
using System.Text;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Net;
using System.Net.Sockets;
using System.Web.Script.Serialization;
using Windows.Foundation;
using Windows.Data.Pdf;
using Windows.Storage.Streams;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Globalization;
class HAKDocs {
 const int Port=31879,MaxBytes=26*1024*1024;static readonly JavaScriptSerializer Json=new JavaScriptSerializer{MaxJsonLength=45*1024*1024};static readonly SemaphoreSlim Busy=new SemaphoreSlim(1,1);static readonly SemaphoreSlim FileBusy=new SemaphoreSlim(1,1);
 [DllImport("user32.dll")]static extern bool SetForegroundWindow(IntPtr hWnd);
 [DllImport("user32.dll")]static extern void keybd_event(byte bVk,byte bScan,uint dwFlags,UIntPtr dwExtraInfo);
 /* Hộp Lưu phải nổi lên trên cửa sổ trình duyệt: Windows chặn tiến trình nền chiếm foreground → nhấn/nhả ALT 1 lần để được phép SetForegroundWindow. */
 static void ForceForeground(IntPtr h){try{keybd_event(0x12,0,0,UIntPtr.Zero);keybd_event(0x12,0,2,UIntPtr.Zero);SetForegroundWindow(h);}catch{}}
 static string Root {get{return Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory,".."));}}
 [System.Runtime.InteropServices.DllImport("shell32.dll")]static extern int SHGetKnownFolderPath(ref Guid id,uint flags,IntPtr token,out IntPtr path);
 static string Downloads(){var id=new Guid("374DE290-123F-4565-9164-39C4925E467B");IntPtr p;int hr=SHGetKnownFolderPath(ref id,0,IntPtr.Zero,out p);if(hr!=0)System.Runtime.InteropServices.Marshal.ThrowExceptionForHR(hr);try{return System.Runtime.InteropServices.Marshal.PtrToStringUni(p);}finally{System.Runtime.InteropServices.Marshal.FreeCoTaskMem(p);}}
 static string DownloadFolder(string name){var root=Path.GetFullPath(Downloads());if(String.IsNullOrWhiteSpace(name))return root;name=name.Trim();if(name.Length>100||name.IndexOfAny(Path.GetInvalidFileNameChars())>=0||name=="."||name==".."||name.EndsWith(".")||name.EndsWith(" ")||System.Text.RegularExpressions.Regex.IsMatch(name,@"^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])($|\.)",System.Text.RegularExpressions.RegexOptions.IgnoreCase))throw new Exception("Tên thư mục không hợp lệ. Không dùng ký tự / \\ : * ? hoặc tên thiết bị Windows.");var target=Path.GetFullPath(Path.Combine(root,name));if(!target.StartsWith(root.TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar,StringComparison.OrdinalIgnoreCase))throw new Exception("Thư mục phải nằm trong Downloads.");return target;}
 static string DownloadLog {get{return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"HAK_LUONG","download-history.json");}}
 static List<string> SavedDownloads(){if(!File.Exists(DownloadLog))return new List<string>();return Json.Deserialize<List<string>>(File.ReadAllText(DownloadLog))??new List<string>();}
 static void RememberDownload(string path){var paths=SavedDownloads();paths.RemoveAll(p=>String.Equals(p,path,StringComparison.OrdinalIgnoreCase));paths.Insert(0,path);paths=paths.Take(100).ToList();Directory.CreateDirectory(Path.GetDirectoryName(DownloadLog));var temp=DownloadLog+".tmp";File.WriteAllText(temp,Json.Serialize(paths),new UTF8Encoding(false));if(File.Exists(DownloadLog))File.Replace(temp,DownloadLog,null);else File.Move(temp,DownloadLog);}
 static object DownloadAction(Dictionary<string,object> data){var action=(string)Get(data,"action","list");var paths=SavedDownloads();if(action=="list")return new{items=paths.Select(p=>new{path=p,name=Path.GetFileName(p),exists=File.Exists(p)}).ToArray()};var path=(string)Get(data,"path","");if(!paths.Any(p=>String.Equals(p,path,StringComparison.OrdinalIgnoreCase)))throw new Exception("Tệp không nằm trong danh sách đã lưu của app.");if(action=="open"){if(!File.Exists(path))throw new Exception("Tệp đã di chuyển hoặc bị xóa.");if(!new[]{".docx",".xlsx",".zip",".json",".pdf",".txt"}.Contains(Path.GetExtension(path).ToLowerInvariant()))throw new Exception("Mở loại tệp này từ thư mục.");Process.Start(new ProcessStartInfo(path){UseShellExecute=true});}else if(action=="reveal"){if(!File.Exists(path))throw new Exception("Tệp đã di chuyển hoặc bị xóa.");Process.Start(new ProcessStartInfo("explorer.exe","/select,\""+path+"\""){UseShellExecute=true});}else throw new Exception("Unknown file action.");return new{ok=true};}
 static object VerifyDownload(Dictionary<string,object> data){var path=(string)Get(data,"path","");if(!SavedDownloads().Any(p=>String.Equals(p,path,StringComparison.OrdinalIgnoreCase)))throw new Exception("File chưa được lưu qua app.");return FileProof(path);}
 static object FileProof(string path){using(var input=File.OpenRead(path))using(var hash=System.Security.Cryptography.SHA256.Create()){return new{path,sha256=BitConverter.ToString(hash.ComputeHash(input)).Replace("-","").ToLowerInvariant(),size=input.Length};}}
 static object SaveDownload(Dictionary<string,object> data){
  var name=Path.GetFileName((string)Get(data,"name","ChungTu.docx"));var ext=Path.GetExtension(name).ToLowerInvariant();if(!new[]{".docx",".xlsx",".xls",".csv",".zip",".json",".pdf",".txt",".gs"}.Contains(ext))throw new Exception("Unsupported download format.");
  var bytes=Convert.FromBase64String((string)Get(data,"base64",""));object result=null;Exception error=null;
  var thread=new Thread(()=>{try{using(var dialog=new System.Windows.Forms.SaveFileDialog()){dialog.Title="Lưu chứng từ HAK";dialog.FileName=name;var previous=SavedDownloads().FirstOrDefault();dialog.InitialDirectory=previous!=null&&Directory.Exists(Path.GetDirectoryName(previous))?Path.GetDirectoryName(previous):Downloads();dialog.Filter="Tệp "+ext+"|*"+ext;dialog.DefaultExt=ext.TrimStart('.');dialog.AddExtension=true;dialog.OverwritePrompt=true;dialog.RestoreDirectory=true;using(var owner=new System.Windows.Forms.Form()){owner.ShowInTaskbar=false;owner.TopMost=true;owner.Opacity=0;owner.Width=1;owner.Height=1;owner.StartPosition=System.Windows.Forms.FormStartPosition.CenterScreen;owner.Show();owner.Activate();owner.BringToFront();ForceForeground(owner.Handle);if(dialog.ShowDialog(owner)!=System.Windows.Forms.DialogResult.OK){result=new{canceled=true};return;}File.WriteAllBytes(dialog.FileName,bytes);string warning="";try{RememberDownload(dialog.FileName);}catch{warning="Đã lưu tệp nhưng chưa ghi được lịch sử tải.";}result=new{canceled=false,path=dialog.FileName,warning};}}}catch(Exception e){error=e;}});thread.SetApartmentState(ApartmentState.STA);thread.Start();thread.Join();if(error!=null)throw error;return result;
 }
 static object Status(){return new {app="hak-windows-ocr",version=1,backend="Windows.Media.Ocr",languages=OcrEngine.AvailableRecognizerLanguages.Select(l=>l.LanguageTag).ToArray(),maxBytes=MaxBytes};}
 static byte[] ParseFile(string path){var f=new FileInfo(path);if(!f.Exists||f.Length>MaxBytes)throw new Exception("PDF exceeds the 26 MB limit or is missing.");return File.ReadAllBytes(path);}
 static T Win<T>(IAsyncOperation<T> op){var until=DateTime.UtcNow.AddMinutes(2);while(op.Status==AsyncStatus.Started){if(DateTime.UtcNow>until){op.Cancel();throw new TimeoutException("Windows OCR operation timed out.");}Thread.Sleep(15);}return op.GetResults();}
 static void Win(IAsyncAction op){var until=DateTime.UtcNow.AddMinutes(2);while(op.Status==AsyncStatus.Started){if(DateTime.UtcNow>until){op.Cancel();throw new TimeoutException("Windows PDF operation timed out.");}Thread.Sleep(15);}op.GetResults();}
 static Task<object> Read(byte[] bytes,int from,int to,string language,string kind="document"){return Task.Run(()=>ReadSync(bytes,from,to,language,kind));}
 static OcrResult OcrScaled(BitmapDecoder decoder,OcrEngine engine,double scale){
  var transform=new BitmapTransform{ScaledWidth=(uint)Math.Max(1.0,decoder.PixelWidth*scale),ScaledHeight=(uint)Math.Max(1.0,decoder.PixelHeight*scale),InterpolationMode=BitmapInterpolationMode.Fant};
  using(var bitmap=Win(decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,transform,ExifOrientationMode.RespectExifOrientation,ColorManagementMode.DoNotColorManage))){
   return Win(engine.RecognizeAsync(bitmap));
  }
 }
 static object ReadImage(byte[] bytes,OcrEngine engine,string tag){
  using(var input=new InMemoryRandomAccessStream()){
   using(var writer=new DataWriter(input)){writer.WriteBytes(bytes);Win<uint>(writer.StoreAsync());writer.DetachStream();} input.Seek(0);
   var decoder=Win(BitmapDecoder.CreateAsync(input));
   // Ảnh chụp điện thoại gửi qua Zalo / email thường rất nhỏ (vd 579x776) → phóng lên tới cạnh dài ~2600 px (tối đa 4 lần) thì Windows OCR mới đọc được chữ nhỏ.
   double max=Math.Min(2600.0,(double)OcrEngine.MaxImageDimension),longSide=Math.Max(decoder.PixelWidth,decoder.PixelHeight);
   double scale=Math.Min(max/longSide,4.0);if(scale<=0)scale=1.0;
   var result=OcrScaled(decoder,engine,scale);
   var positioned=result.Lines.Select(l=>new {text=l.Text,x=l.Words.Min(w=>w.BoundingRect.X),y=l.Words.Min(w=>w.BoundingRect.Y),width=l.Words.Max(w=>w.BoundingRect.Right)-l.Words.Min(w=>w.BoundingRect.X),height=l.Words.Max(w=>w.BoundingRect.Bottom)-l.Words.Min(w=>w.BoundingRect.Y)}).OrderBy(l=>l.y).ToArray();
   var rows=new List<List<int>>();for(int i=0;i<positioned.Length;i++){var l=positioned[i];var row=rows.LastOrDefault(r=>Math.Abs(positioned[r[0]].y-l.y)<Math.Min(positioned[r[0]].height,l.height)*0.6);if(row==null){row=new List<int>();rows.Add(row);}row.Add(i);}
   var rowText=String.Join("\n",rows.Select(r=>String.Join(" : ",r.OrderBy(i=>positioned[i].x).Select(i=>positioned[i].text))));
   // Lượt thứ hai ở độ phóng nhỏ hơn: engine OCR đôi khi đọc được dòng mà lượt đầu bỏ sót (lượt này chỉ bổ sung chữ, không có tọa độ).
   string extra="";try{var second=OcrScaled(decoder,engine,Math.Max(0.5,scale*0.7));extra=String.Join("\n",second.Lines.Select(l=>l.Text));}catch(Exception){}
   var pages=new List<object>();pages.Add(new{page=1,text=String.Join("\n",result.Lines.Select(l=>l.Text)),rowsText=rowText,lines=positioned,supplementalText=extra});
   return new {app="hak-windows-ocr",backend="Windows.Media.Ocr",language=tag,totalPages=1,from=1,to=1,pages,warnings=tag.StartsWith("vi")?new string[0]:new[]{"Windows OCR language is "+tag+". Verify Vietnamese text against the original image."}};
  }
 }
 static object ReadSync(byte[] bytes,int from,int to,string language,string kind){
  bool isPdf=bytes.Length>=5&&Encoding.ASCII.GetString(bytes,0,5)=="%PDF-";
  bool isImage=bytes.Length>16&&((bytes[0]==0xFF&&bytes[1]==0xD8)||(bytes[0]==0x89&&bytes[1]==0x50&&bytes[2]==0x4E&&bytes[3]==0x47)||(bytes[0]==0x42&&bytes[1]==0x4D));
  if(bytes.Length>MaxBytes||!(isPdf||isImage))throw new Exception("Invalid PDF/image or size exceeds 26 MB.");
  var langs=OcrEngine.AvailableRecognizerLanguages;if(langs.Count==0)throw new Exception("Windows has no OCR language installed. Add a supported language in Windows Settings.");
  var lang=langs.FirstOrDefault(l=>l.LanguageTag==language)??langs.FirstOrDefault(l=>l.LanguageTag.StartsWith("vi"))??langs.FirstOrDefault(l=>l.LanguageTag=="en-US")??langs[0];
  var engine=OcrEngine.TryCreateFromLanguage(lang);if(engine==null)throw new Exception("Cannot create Windows OCR engine.");
  if(isImage)return ReadImage(bytes,engine,lang.LanguageTag);
  var pages=new List<object>();
  using(var input=new InMemoryRandomAccessStream()){
   using(var writer=new DataWriter(input)){writer.WriteBytes(bytes);Win<uint>(writer.StoreAsync());writer.DetachStream();} input.Seek(0);
   var pdf=Win(PdfDocument.LoadFromStreamAsync(input));if(from<1)from=1;if(to==0)to=(int)pdf.PageCount;if(from>to||to>pdf.PageCount||to-from+1>60)throw new Exception("Choose a valid page range of at most 60 pages.");
   for(int n=from;n<=to;n++)using(var page=pdf.GetPage((uint)n-1))using(var image=new InMemoryRandomAccessStream()){
    var scale=Math.Min(2.7,Math.Min(3400/page.Size.Width,3400/page.Size.Height));var opt=new PdfPageRenderOptions{DestinationWidth=(uint)(page.Size.Width*scale),DestinationHeight=(uint)(page.Size.Height*scale)};
    Win(page.RenderToStreamAsync(image,opt));image.Seek(0);var decoder=Win(BitmapDecoder.CreateAsync(image));
    using(var bitmap=Win(decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied))){
     var result=Win(engine.RecognizeAsync(bitmap));
     var positioned=result.Lines.Select(l=>new {text=l.Text,x=l.Words.Min(w=>w.BoundingRect.X),y=l.Words.Min(w=>w.BoundingRect.Y),width=l.Words.Max(w=>w.BoundingRect.Right)-l.Words.Min(w=>w.BoundingRect.X),height=l.Words.Max(w=>w.BoundingRect.Bottom)-l.Words.Min(w=>w.BoundingRect.Y)}).OrderBy(l=>l.y).ToArray();
     var rows=new List<List<int>>();for(int i=0;i<positioned.Length;i++){var l=positioned[i];var row=rows.LastOrDefault(r=>Math.Abs(positioned[r[0]].y-l.y)<Math.Min(positioned[r[0]].height,l.height)*0.6);if(row==null){row=new List<int>();rows.Add(row);}row.Add(i);}
     var rowText=String.Join("\n",rows.Select(r=>String.Join(" : ",r.OrderBy(i=>positioned[i].x).Select(i=>positioned[i].text))));
     var extra=new List<string>();if(kind=="certificate")for(int band=0;band<11;band++){
      var transform=new BitmapTransform{ScaledWidth=band<8?decoder.PixelWidth/2:decoder.PixelWidth,ScaledHeight=decoder.PixelHeight/2,Bounds=new BitmapBounds{X=(uint)(decoder.PixelWidth*(band<8?0.5:1)*(band<4?0:band<8?0.25:0.33)),Y=(uint)(decoder.PixelHeight*0.5*(band<8?0.30+(band%4)*0.12:0.53+(band-8)*0.06)),Width=(uint)(decoder.PixelWidth*(band<8?0.5:1)*(band<4?1:band<8?0.65:0.4)),Height=(uint)(decoder.PixelHeight*0.5*(band<8?0.14:0.08))}};
      using(var crop=Win(decoder.GetSoftwareBitmapAsync(BitmapPixelFormat.Bgra8,BitmapAlphaMode.Premultiplied,transform,ExifOrientationMode.IgnoreExifOrientation,ColorManagementMode.DoNotColorManage))){var part=Win(engine.RecognizeAsync(crop));extra.Add(String.Join("\n",part.Lines.Select(l=>l.Text)));
       var buffer=new Windows.Storage.Streams.Buffer((uint)(crop.PixelWidth*crop.PixelHeight*4));crop.CopyToBuffer(buffer);var pixels=new byte[buffer.Length];using(var reader=DataReader.FromBuffer(buffer)){reader.ReadBytes(pixels);}for(int q=0;q<pixels.Length;q+=4){byte color=(byte)((pixels[q]+pixels[q+1]+pixels[q+2])/3<140?0:255);pixels[q]=pixels[q+1]=pixels[q+2]=color;pixels[q+3]=255;}var originalPixels=(byte[])pixels.Clone();int stride=crop.PixelWidth*4;for(int q=stride+4;q<pixels.Length-stride-4;q+=4)if(originalPixels[q]==0&&(originalPixels[q-4]==255||originalPixels[q+4]==255||originalPixels[q-stride]==255||originalPixels[q+stride]==255))pixels[q]=pixels[q+1]=pixels[q+2]=255;using(var writer=new DataWriter()){writer.WriteBytes(pixels);crop.CopyFromBuffer(writer.DetachBuffer());}var clear=Win(engine.RecognizeAsync(crop));extra.Add(String.Join("\n",clear.Lines.Select(l=>l.Text)));}
     }
     pages.Add(new{page=n,text=String.Join("\n",result.Lines.Select(l=>l.Text)),rowsText=rowText,lines=positioned,supplementalText=String.Join("\n",extra)});
    }
   }
   return new {app="hak-windows-ocr",backend="Windows.Media.Ocr",language=lang.LanguageTag,totalPages=pdf.PageCount,from,to,pages,warnings=lang.LanguageTag.StartsWith("vi")?new string[0]:new[]{"Windows OCR language is "+lang.LanguageTag+". Verify Vietnamese text against the original PDF."}};
  }
 }
 static object Get(Dictionary<string,object> d,string k,object fallback){object v;return d.TryGetValue(k,out v)?v:fallback;}
 static async Task Handle(TcpClient client){
  using(client){client.ReceiveTimeout=15000;client.SendTimeout=15000;var stream=client.GetStream();var header=new List<byte>();int v;
   while(header.Count<32768&&(v=stream.ReadByte())>=0){header.Add((byte)v);int n=header.Count;if(n>=4&&header[n-4]==13&&header[n-3]==10&&header[n-2]==13&&header[n-1]==10)break;}
   var lines=Encoding.ASCII.GetString(header.ToArray()).Split(new[]{"\r\n"},StringSplitOptions.None);var request=lines[0].Split(' ');var headers=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
   foreach(var line in lines.Skip(1)){int i=line.IndexOf(':');if(i>0)headers[line.Substring(0,i)]=line.Substring(i+1).Trim();}
   string origin=headers.ContainsKey("Origin")?headers["Origin"]:"";
   if(origin!="null"&&origin!=""){await Reply(stream,403,new{error="Only the local HAK file app can use Windows OCR."},false);return;}
   string method=request.Length>0?request[0]:"",path=request.Length>1?request[1]:"";
   if(method=="OPTIONS"){await Reply(stream,200,new{ok=true},origin=="null");return;}
   if(method=="GET"&&path=="/status"){await Reply(stream,200,Status(),origin=="null");return;}
   if(method!="POST"||(path!="/ocr"&&path!="/downloads"&&path!="/save-download"&&path!="/download-files"&&path!="/verify-download")||!headers.ContainsKey("X-HAK-Client")||headers["X-HAK-Client"]!="documents-v1"){await Reply(stream,403,new{error="Invalid local OCR request."},origin=="null");return;}
   int length;if(!headers.ContainsKey("Content-Length")||!Int32.TryParse(headers["Content-Length"],out length)||length<1||length>36*1024*1024){int declared;if(headers.ContainsKey("Content-Length")&&Int32.TryParse(headers["Content-Length"],out declared)&&declared>0){var sink=new byte[65536];long left=Math.Min((long)declared,256L*1024*1024);try{while(left>0){int got=await stream.ReadAsync(sink,0,(int)Math.Min((long)sink.Length,left));if(got<=0)break;left-=got;}}catch{}}await Reply(stream,413,new{error="Request is too large (limit 36 MB)."},origin=="null");return;}
   var gate=path=="/ocr"?Busy:FileBusy;
   if(path=="/ocr"){if(!await gate.WaitAsync(0)){await Reply(stream,409,new{error="OCR is processing another document. Please wait."},origin=="null");return;}}
   else if(!await gate.WaitAsync(TimeSpan.FromMinutes(10))){await Reply(stream,409,new{error="A Save dialog is still open. Close it and try again."},origin=="null");return;}
   object response=null;int responseCode=200;
   try {var body=new byte[length];int count=0;while(count<length){int n=await stream.ReadAsync(body,count,length-count);if(n==0)throw new Exception("Incomplete request.");count+=n;}
    var data=Json.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(body));
    if(path=="/verify-download"){response=VerifyDownload(data);}
    else if(path=="/download-files"){response=DownloadAction(data);}
    else if(path=="/save-download"){response=SaveDownload(data);}
    else if(path=="/downloads"){var action=(string)Get(data,"action","");if(action!="open"&&action!="create")throw new Exception("Unknown folder action.");var name=(string)Get(data,"name","");if(action=="create"&&String.IsNullOrWhiteSpace(name))throw new Exception("Nhập tên thư mục.");var folder=DownloadFolder(name);if(action=="create")Directory.CreateDirectory(folder);if(!Directory.Exists(folder))throw new Exception("Thư mục chưa tồn tại.");Process.Start(new ProcessStartInfo(folder){UseShellExecute=true});response=new{ok=true,path=folder};}
    else {var bytes=Convert.FromBase64String((string)Get(data,"base64",""));
    var job=Read(bytes,Convert.ToInt32(Get(data,"from",1)),Convert.ToInt32(Get(data,"to",0)),(string)Get(data,"language",""),(string)Get(data,"kind","document"));
    response=await job;}
   }catch(Exception e){responseCode=400;response=new{error=e.Message};}finally{gate.Release();}
   await Reply(stream,responseCode,response,origin=="null");
  }
 }
 static async Task Reply(Stream s,int code,object data,bool cors){var bytes=Encoding.UTF8.GetBytes(Json.Serialize(data));var head="HTTP/1.1 "+code+" "+(code==200?"OK":"Error")+"\r\nContent-Type: application/json; charset=utf-8\r\nCache-Control: no-store\r\nConnection: close\r\nContent-Length: "+bytes.Length+"\r\n"+(cors?"Access-Control-Allow-Origin: null\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, X-HAK-Client\r\nAccess-Control-Allow-Private-Network: true\r\n":"")+"\r\n";var h=Encoding.ASCII.GetBytes(head);await s.WriteAsync(h,0,h.Length);await s.WriteAsync(bytes,0,bytes.Length);}
 static void Serve(){using(var single=new Mutex(false,"Local\\HAK.WindowsOCR.31879")){if(!single.WaitOne(0))return;try{var listener=new TcpListener(IPAddress.Loopback,Port);listener.Start();DateTime last=DateTime.UtcNow;while(DateTime.UtcNow-last<TimeSpan.FromHours(24)){if(!listener.Pending()){Thread.Sleep(200);continue;}var c=listener.AcceptTcpClient();last=DateTime.UtcNow;Task.Run(async()=>{try{await Handle(c);}catch{c.Close();}});}listener.Stop();}finally{single.ReleaseMutex();}}}
 [STAThread]static int Main(string[] args){try{
  if(args.Length>0&&args[0]=="--status"){Console.WriteLine(Json.Serialize(Status()));return 0;}
  if(args.Length>=3&&args[0]=="--ocr"){var result=Read(ParseFile(args[1]),args.Length>3?Int32.Parse(args[3]):1,args.Length>4?Int32.Parse(args[4]):0,"",args.Length>5?args[5]:"document").GetAwaiter().GetResult();File.WriteAllText(args[2],Json.Serialize(result),new UTF8Encoding(false));return 0;}
  if(args.Length>0&&args[0]=="--serve"){Serve();return 0;}
  Process.Start(new ProcessStartInfo(Process.GetCurrentProcess().MainModule.FileName,"--serve"){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden});
  Process.Start(new ProcessStartInfo(Path.Combine(Root,"index.html")){UseShellExecute=true});return 0;
 }catch(Exception e){if(args.Length>=3&&args[0]=="--ocr")try{File.WriteAllText(args[2],Json.Serialize(new{error=e.ToString()}),new UTF8Encoding(false));}catch{}Console.Error.WriteLine(e.ToString());return 1;}}
}
