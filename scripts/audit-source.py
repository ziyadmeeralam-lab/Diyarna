"""Read-only audit of all display Arabic against its original Word paragraph pairs."""
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET
import json
ROOT=Path(__file__).resolve().parents[1]
NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
data=json.loads((ROOT/'src/data/arabic.json').read_text(encoding='utf-8'))
count=0
for region,record in data.items():
    with ZipFile(ROOT/record['source']) as z:
        document=ET.fromstring(z.read('word/document.xml'))
        paragraphs=[''.join(t.text or '' for t in p.findall('.//w:t',NS)).strip() for p in document.findall('.//w:p',NS)]
        paragraphs=[p for p in paragraphs if p]
    for category,prefix in [('foods','أول'),('arts','ثاني'),('places','ثالث')]:
        start=next(i for i,p in enumerate(paragraphs) if p.startswith(prefix))+1
        for i,item in enumerate(record[category]):
            assert item['name']==paragraphs[start+i*2],item['id']+' name mismatch'
            assert item['description']==paragraphs[start+i*2+1],item['id']+' description mismatch'
            count+=1
print(f'PASS: {count} item names and {count} descriptions match original DOCX paragraphs exactly.')
