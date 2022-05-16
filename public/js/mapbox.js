/* eslint-disable */
export const displayMap = locations => {
mapboxgl.accessToken =
  'pk.eyJ1IjoibW9oYW1lbWQtYmVuLWFvdW1ldXIiLCJhIjoiY2wyeWpjdWR6MGg4azNjc2J1ODhrNG9rNyJ9.Rl0sRYhX08uYhsWz08OXFA';

  // You should have html element of ID map
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mohamemd-ben-aoumeur/cl2yjzuc0000f14p12s378ge5',
    scrollZoom: false,
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    }).setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30
    }).setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};
