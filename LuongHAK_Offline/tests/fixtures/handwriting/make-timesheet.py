"""Public MNIST handwriting in a generated attendance grid, no employee documents."""
from pathlib import Path
import base64,gzip,json
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parent
data=json.loads(gzip.decompress((root/'mnist-test-100.json.gz').read_bytes()))
font_path=Path('C:/Windows/Fonts/arial.ttf')
font=ImageFont.truetype(str(font_path),22)
large=ImageFont.truetype(str(font_path),30)
left,top,name_width,day_width,row_height,total_width=24,120,360,58,64,110
width=left*2+name_width+30*day_width+total_width
image=Image.new('L',(width,top+4*row_height+30),255); draw=ImageDraw.Draw(image)
draw.text((left,18),'BẢNG CHẤM CÔNG',font=large,fill=0)
draw.text((left,62),'Tháng 09/2026',font=font,fill=0)
xs=[left,left+name_width]+[left+name_width+i*day_width for i in range(1,31)]+[width-left]
for x in xs:draw.line((x,top,x,top+4*row_height),fill=0,width=2)
for row in range(5):draw.line((left,top+row*row_height,width-left,top+row*row_height),fill=0,width=2)
draw.text((left+12,top+19),'Họ và tên',font=font,fill=0)
for day in range(1,31):draw.text((left+name_width+(day-1)*day_width+14,top+19),str(day),font=font,fill=0)
draw.text((width-left-total_width+8,top+19),'Tổng công',font=font,fill=0)
for row,(name,label) in enumerate([('E2E Nhân Viên',1),('Phạm Minh Khoa',2),('Đỗ Thu Hằng',3)]):
 y=top+(row+1)*row_height
 draw.text((left+12,y+19),name,font=font,fill=0)
 samples=[sample for sample in data['samples'] if sample['label']==label]
 for day in range(30):
  sample=samples[day%len(samples)]
  glyph=Image.frombytes('L',(28,28),bytes(255-v for v in base64.b64decode(sample['pixels']))).resize((40,40))
  image.paste(glyph,(left+name_width+day*day_width+9,y+12))
 draw.text((width-left-total_width+22,y+19),str(label*30),font=font,fill=0)
image.save(root/'mnist-timesheet.png')
