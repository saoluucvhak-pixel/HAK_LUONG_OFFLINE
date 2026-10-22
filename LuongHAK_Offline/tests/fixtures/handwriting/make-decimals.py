"""Composited public MNIST digits; computer-drawn separator, not real decimal handwriting."""
from pathlib import Path
import base64, gzip, json
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parent
samples = json.loads(gzip.decompress((root/'mnist-test-100.json.gz').read_bytes()))['samples']
glyphs = {label: next(s for s in samples if s['label'] == label) for label in (0, 1, 5)}
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
left, top, nw, dw, rh, tw = 24, 120, 360, 86, 64, 110
width = left*2 + nw + 30*dw + tw
image = Image.new('L', (width, top+3*rh+30), 255)
d = ImageDraw.Draw(image)
d.text((left, 18), 'BẢNG CHẤM CÔNG', font=font, fill=0)
d.text((left, 62), 'Tháng 09/2026', font=font, fill=0)
for x in [left, left+nw]+[left+nw+i*dw for i in range(1, 31)]+[width-left]:
    d.line((x, top, x, top+3*rh), fill=0, width=2)
for row in range(4): d.line((left, top+row*rh, width-left, top+row*rh), fill=0, width=2)
d.text((left+12, top+19), 'Họ và tên', font=font, fill=0)
for day in range(30): d.text((left+nw+day*dw+22, top+19), str(day+1), font=font, fill=0)
d.text((width-left-tw+8, top+19), 'Tổng công', font=font, fill=0)
for row, (name, label) in enumerate([('E2E Nhân Viên', 0), ('Phạm Minh Khoa', 1)]):
    y = top+(row+1)*rh
    d.text((left+12, y+19), name, font=font, fill=0)
    for day in range(30):
        x = left+nw+day*dw+4
        for digit, offset in [(label, 0), (5, 42)]:
            glyph = Image.frombytes('L', (28, 28), bytes(255-v for v in base64.b64decode(glyphs[digit]['pixels'])))
            image.paste(glyph, (x+offset, y+14))
        d.rectangle((x+33, y+36, x+34, y+39), fill=0)
    d.text((width-left-tw+20, y+19), str(15+row*30), font=font, fill=0)
image.save(root/'mnist-decimals.png')
