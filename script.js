document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('search-btn');
    const locationInput = document.getElementById('location');
    const countryInput = document.getElementById('country');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    // Sample data for Kigali as fallback
    const kigaliRestaurants = [
        {
            name: "Heaven Restaurant",
            type: "International, Rwandan",
            address: "KN 29 St, Kigali",
            website: "https://heavenrwanda.com"
        },
        {
            name: "Poivre Noir",
            type: "French, European",
            address: "KG 624 St, Kigali",
            website: "https://poivrenoir.rw"
        },
        {
            name: "Khana Khazana",
            type: "Indian",
            address: "KN 3 Ave, Kigali",
            website: "https://khanakhazana.rw"
        },
        {
            name: "Sole Luna",
            type: "Italian",
            address: "KG 7 Ave, Kigali"
        },
        {
            name: "The Hut",
            type: "Rwandan, African",
            address: "KK 15 Ave, Kigali"
        }
    ];

    searchBtn.addEventListener('click', searchRestaurants);
    locationInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchRestaurants());
    countryInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchRestaurants());

    async function searchRestaurants() {
        const location = locationInput.value.trim();
        const country = countryInput.value.trim().toLowerCase();

        if (!location) {
            showError('Please enter a location');
            return;
        }

        clearResults();
        showLoading();

        try {
            // Special handling for Kigali
            if (isKigaliSearch(location, country)) {
                displayKigaliResults();
                return;
            }

            // Proceed with normal API search
            const coords = await getCoordinates(location);
            if (!coords) {
                showError('Location not found. Try a different city or address.');
                return;
            }

            const restaurants = await findRestaurants(coords.lat, coords.lon, country);
            displayApiResults(restaurants, country);
        } catch (error) {
            console.error('Error:', error);
            if (isKigaliSearch(location, country)) {
                displayKigaliResults();
            } else {
                showError('An error occurred. Please try again later.');
            }
        } finally {
            hideLoading();
        }
    }

    function isKigaliSearch(location, country) {
        return location.toLowerCase().includes('kigali') || country === 'rwanda';
    }

    async function getCoordinates(location) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
            if (!response.ok) throw new Error('Geocoding failed');
            
            const data = await response.json();
            return data.length > 0 ? { lat: data[0].lat, lon: data[0].lon } : null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    async function findRestaurants(lat, lon, country) {
        try {
            let query = `
                [out:json];
                (
                    node["amenity"="restaurant"](around:2000,${lat},${lon});
                    ${country ? `node["amenity"="restaurant"]["addr:country"~"${country}",i](around:2000,${lat},${lon});` : ''}
                );
                out body;
                >;
                out skel qt;
            `;

            const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Restaurant search failed');
            
            const data = await response.json();
            return data.elements || [];
        } catch (error) {
            console.error('Restaurant search error:', error);
            throw error;
        }
    }

    function displayKigaliResults() {
        const cards = kigaliRestaurants.map(restaurant => createRestaurantCard(restaurant));
        resultsDiv.append(...cards);
    }

    function displayApiResults(restaurants, countryFilter) {
        resultsDiv.innerHTML = '';

        if (!restaurants || restaurants.length === 0) {
            showError(`No restaurants found${countryFilter ? ` in ${countryFilter}` : ''}. Try a different location.`);
            return;
        }

        if (countryFilter) {
            restaurants = restaurants.filter(r => 
                r.tags?.['addr:country']?.toLowerCase().includes(countryFilter.toLowerCase())
            );
            
            if (restaurants.length === 0) {
                showError(`No restaurants found in ${countryFilter}. Try a different country.`);
                return;
            }
        }

        const cards = restaurants
            .filter(r => r.tags?.name)
            .map(restaurant => createRestaurantCard({
                name: restaurant.tags.name,
                type: restaurant.tags.cuisine,
                address: getFullAddress(restaurant.tags),
                website: restaurant.tags.website
            }));

        resultsDiv.append(...cards);
    }

    function createRestaurantCard(restaurant) {
        const card = document.createElement('div');
        card.className = 'restaurant-card';
        
        card.innerHTML = `
            <h3>${restaurant.name}</h3>
            ${restaurant.type ? `<p><i class="fas fa-utensils"></i> ${restaurant.type}</p>` : ''}
            ${restaurant.address ? `<p class="address"><i class="fas fa-map-marker-alt"></i> ${restaurant.address}</p>` : ''}
            ${restaurant.website ? `
            <a href="${restaurant.website.startsWith('http') ? restaurant.website : 'https://' + restaurant.website}" 
               target="_blank">
               <i class="fas fa-external-link-alt"></i> Visit Website
            </a>
            ` : ''}
        `;
        
        return card;
    }

    function getFullAddress(tags) {
        let address = '';
        if (tags['addr:housenumber']) address += tags['addr:housenumber'] + ' ';
        if (tags['addr:street']) address += tags['addr:street'];
        if (tags['addr:city']) address += (address ? ', ' : '') + tags['addr:city'];
        if (tags['addr:country']) address += (address ? ', ' : '') + tags['addr:country'];
        return address;
    }

    function clearResults() {
        resultsDiv.innerHTML = '';
        hideError();
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