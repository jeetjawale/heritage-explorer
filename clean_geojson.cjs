const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/data/cultural_places.geojson');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

let cleanedCount = 0;
data.features.forEach(feature => {
  if (feature.properties && feature.properties.Latitude !== undefined && feature.properties.Longitude !== undefined) {
    delete feature.properties.Latitude;
    delete feature.properties.Longitude;
    cleanedCount++;
  }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Cleaned ${cleanedCount} features.`);
