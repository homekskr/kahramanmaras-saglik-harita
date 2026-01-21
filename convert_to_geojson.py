import json
import os

input_path = r'c:\Users\KSKR\Desktop\harita\assets\maraş_raw.json'
output_path = r'c:\Users\KSKR\Desktop\harita\assets\kahramanmaras_border.json'

if not os.path.exists(input_path):
    print(f"Error: {input_path} not found")
    exit(1)

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

features = []
for element in data.get('elements', []):
    if element.get('type') == 'relation':
        for member in element.get('members', []):
            if member.get('type') == 'way' and 'geometry' in member:
                coords = [[pt['lon'], pt['lat']] for pt in member['geometry']]
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coords
                    },
                    "properties": {
                        "role": member.get('role', '')
                    }
                })

geojson = {
    "type": "FeatureCollection",
    "features": features
}

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False, indent=2)

print(f"Successfully converted to {output_path}")
