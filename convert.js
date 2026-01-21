const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'assets', 'maraş_raw.json');
const outputPath = path.join(__dirname, 'assets', 'kahramanmaras_border.json');

try {
    let rawData = fs.readFileSync(inputPath, 'utf8');
    // Remove BOM if present
    if (rawData.charCodeAt(0) === 0xFEFF) {
        rawData = rawData.slice(1);
    }
    const data = JSON.parse(rawData);

    const features = [];
    if (data.elements) {
        data.elements.forEach(element => {
            if (element.type === 'relation' && element.members) {
                element.members.forEach(member => {
                    if (member.type === 'way' && member.geometry) {
                        const coords = member.geometry.map(pt => [pt.lon, pt.lat]);
                        features.push({
                            type: "Feature",
                            geometry: {
                                type: "LineString",
                                coordinates: coords
                            },
                            properties: {
                                role: member.role || ''
                            }
                        });
                    }
                });
            }
        });
    }

    const geojson = {
        type: "FeatureCollection",
        features: features
    };

    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), 'utf8');
    console.log(`Successfully converted to ${outputPath}`);
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
