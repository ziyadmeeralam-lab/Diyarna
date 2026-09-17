"""Rebuild Arabic content directly from untouched source DOCX files (stdlib only)."""
import json
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
regions = ['riyadh', 'makkah', 'asir', 'qassim']
result = {}
for index, region in enumerate(regions, 1):
    source = f'{index}-{region}-content.docx'
    with ZipFile(ROOT / 'content' / source) as archive:
        document = ET.fromstring(archive.read('word/document.xml'))
        paragraphs = [''.join(p.itertext()) for p in []]
        paragraphs = [''.join(t.text or '' for t in p.findall('.//w:t', NS)).strip()
                      for p in document.findall('.//w:p', NS)]
        paragraphs = [p for p in paragraphs if p]
    categories = {}
    for category, prefix in [('foods', 'أول'), ('arts', 'ثاني'), ('places', 'ثالث')]:
        start = next(i for i, p in enumerate(paragraphs) if p.startswith(prefix)) + 1
        categories[category] = [{'id': f'{region}-{category}-{i+1}',
                                 'name': paragraphs[start + i * 2],
                                 'description': paragraphs[start + i * 2 + 1]}
                                for i in range(3)]
    result[region] = {'source': f'content/{source}', 'sourceName': paragraphs[0], **categories}
destination = ROOT / 'src' / 'data' / 'arabic.json'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Extracted {len(result)} regions, 36 items: {destination}')
