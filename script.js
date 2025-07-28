document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('search-btn');
    const locationInput = document.getElementById('location');
    const cuisineInput = document.getElementById('cuisine');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    searchBtn.addEventListener('click', searchRestaurants);

    // Also allow search on pressing Enter
    locationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchRestaurants();
    });

    cuisineInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchRestaurants();
    });

    async function searchRestaurants() {
        const location = locationInput.value.trim();
        const cuisine = cuisineInput.value.trim();

        if (!location) {
            showError('Please enter a location');
            return;
        }

        // Clear previous results and errors
        resultsDiv.innerHTML = '';
        hideError();
        showLoading();

        try {
            // Step 1: Geocode location (get coordinates)
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
            const geocodeResponse = await fetch(geocodeUrl);
            
            if (!geocodeResponse.ok) {
                throw new Error('Failed to fetch location data');
            }

            const geocodeData = await geocodeResponse.json();

            if (geocodeData.length === 0) {
                showError('Location not found. Try a different city or address.');
                return;
            }

            const { lat, lon } = geocodeData[0];
            
            // Step 2: Fetch restaurants using Overpass API
            let overpassQuery = `
                [out:json];
                (
                    node["amenity"="restaurant"](around:2000,${lat},${lon});
                    ${cuisine ? `node["amenity"="restaurant"]["cuisine"~"${cuisine}",i](around:2000,${lat},${lon});` : ''}
                );
                out body;
                >;
                out skel qt;
            `;

            const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
            const overpassResponse = await fetch(overpassUrl);
            
            if (!overpassResponse.ok) {
                throw new Error('Failed to fetch restaurant data');
            }

            const restaurantsData = await overpassResponse.json();
            displayResults(restaurantsData.elements);
        } catch (error) {
            console.error('Error:', error);
            showError('An error occurred. Please try again later.');
        } finally {
            hideLoading();
        }
    }

    function displayResults(restaurants) {
        resultsDiv.innerHTML = '';

        if (!restaurants || restaurants.length === 0) {
            showError('No restaurants found. Try a different location or cuisine.');
            return;
        }

        restaurants.forEach(restaurant => {
            if (restaurant.tags?.name) {
                const card = document.createElement('div');
                card.className = 'restaurant-card';
                
                const name = document.createElement('h3');
                name.textContent = restaurant.tags.name;
                card.appendChild(name);

                if (restaurant.tags.cuisine) {
                    const cuisine = document.createElement('p');
                    cuisine.innerHTML = `<i class="fas fa-utensils"></i> ${restaurant.tags.cuisine}`;
                    card.appendChild(cuisine);
                }

                if (restaurant.tags['addr:street']) {
                    const address = document.createElement('p');
                    address.className = 'address';
                    address.innerHTML = `<i class="fas fa-map-marker-alt"></i> `;
                    
                    let addrText = restaurant.tags['addr:street'];
                    if (restaurant.tags['addr:housenumber']) {
                        addrText = `${restaurant.tags['addr:housenumber']} ${addrText}`;
                    }
                    if (restaurant.tags['addr:city']) {
                        addrText += `, ${restaurant.tags['addr:city']}`;
                    }
                    
                    address.textContent += addrText;
                    card.appendChild(address);
                }

                if (restaurant.tags.website) {
                    const website = document.createElement('a');
                    website.href = restaurant.tags.website.startsWith('http') ? 
                        restaurant.tags.website : `https://${restaurant.tags.website}`;
                    website.innerHTML = `<i class="fas fa-external-link-alt"></i> Visit Website`;
                    website.target = '_blank';
                    website.style.marginTop = '10px';
                    card.appendChild(website);
                }

                resultsDiv.appendChild(card);
            }
        });
    }

    function showLoading() {
        loadingDiv.style.display = 'block';
    }

    function hideLoading() {
        loadingDiv.style.display = 'none';
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    function hideError() {
        errorDiv.style.display = 'none';
    }
});