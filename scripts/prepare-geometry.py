"""Compact already-simplified geoBoundaries polygons; retain only supported region IDs."""
import json
from pathlib import Path
root = Path(__file__).resolve().parents[1]
source = json.loads((root / 'inspection/regions.geojson').read_text())
ids = {'SA-01': 'riyadh', 'SA-02': 'makkah', 'SA-14': 'asir', 'SA-05': 'qassim'}
def area(ring):
    return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(ring,ring[1:]))) / 2
features = []
for feature in source['features']:
    geom = feature['geometry']
    polygons = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    # Omit tiny offshore islands at this exhibition scale, preserve mainland outlines.
    polygons = [p for p in polygons if area(p[0]) > .012]
    features.append({'id': ids.get(feature['properties']['shapeISO']),
                     'polygons': [[[[round(n,4) for n in point] for point in ring] for ring in polygon] for polygon in polygons]})
(root / 'public/data/saudi-regions.json').write_text(json.dumps(features,separators=(',',':')))
print('Prepared',len(features),'geographic areas; 4 interactive regions')
