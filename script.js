document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('search-btn');
    const cityInput = document.getElementById('city');
    const cuisineInput = document.getElementById('cuisine');
    const sortSelect = document.getElementById('sort');
    const citySuggestions = document.getElementById('city-suggestions');
    const resultsDiv = document.getElementById('results');
    const resultsTitle = document.getElementById('results-title');
    const resultsCount = document.getElementById('results-count');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');

    // City autocomplete
    cityInput.addEventListener('input', debounce(fetchCitySuggestions, 300));
    searchBtn.addEventListener('click', searchRestaurants);
    sortSelect.addEventListener('change', sortResults);

    // Also allow search on pressing Enter
    cityInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchRestaurants();
    });

    cuisineInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchRestaurants();
    });

    // Debounce function to limit API calls
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // Fetch city suggestions
    async function fetchCitySuggestions() {
        const query = cityInput.value.trim();
        if (query.length < 3) return;

        try {
            const response = await fetch(`https://geocode.maps.co/search?q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();
            
            citySuggestions.innerHTML = '';
            data.forEach(item => {
                if (item.type === 'city' || item.type === 'town') {
                    const option = document.createElement('option');
                    option.value = item.display_name.split(',')[0]; // Get city name
                    citySuggestions.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Error fetching city suggestions:', error);
        }
    }

    async function searchRestaurants() {
        const city = cityInput.value.trim();
        const cuisine = cuisineInput.value.trim();

        if (!city) {
            showError('Please enter a city name');
            return;
        }

        // Clear previous results and errors
        resultsDiv.innerHTML = '';
        hideError();
        showLoading();
        resultsTitle.textContent = 'Restaurants';
        resultsCount.textContent = '0 found';

        try {
            // Step 1: Geocode city to get bounding box
            const geocodeUrl = `https://geocode.maps.co/search?q=${encodeURIComponent(city)}&format=json`;
            const geocodeResponse = await fetch(geocodeUrl);
            
            if (!geocodeResponse.ok) {
                throw new Error('Failed to fetch city data');
            }

            const geocodeData = await geocodeResponse.json();

            if (geocodeData.length === 0) {
                showError('City not found. Please try a different name.');
                return;
            }

            // Get the first result (most relevant city)
            const cityData = geocodeData[0];
            resultsTitle.textContent = `Restaurants in ${cityData.display_name.split(',')[0]}`;

            // Step 2: Fetch restaurants using Overpass API with bounding box
            let overpassQuery = `
                [out:json];
                (
                    node["amenity"="restaurant"](${cityData.boundingbox.join(',')});
                    ${cuisine ? `node["amenity"="restaurant"]["cuisine"~"${cuisine}",i](${cityData.boundingbox.join(',')});` : ''}
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
            showError('No restaurants found. Try a different city or cuisine.');
            resultsCount.textContent = '0 found';
            return;
        }

        // Filter only restaurants with names
        const validRestaurants = restaurants.filter(r => r.tags?.name);
        resultsCount.textContent = `${validRestaurants.length} found`;

        validRestaurants.forEach(restaurant => {
            const card = document.createElement('div');
            card.className = 'restaurant-card';
            
            card.innerHTML = `
                <div class="restaurant-info">
                    <div class="restaurant-main">
                        <h3>${restaurant.tags.name}</h3>
                        ${restaurant.tags.cuisine ? `<p><i class="fas fa-utensils"></i> ${restaurant.tags.cuisine}</p>` : ''}
                        ${getRatingHTML(restaurant)}
                        ${restaurant.tags['addr:street'] ? `<p class="address"><i class="fas fa-map-marker-alt"></i> ${formatAddress(restaurant)}</p>` : ''}
                    </div>
                </div>
                <div class="restaurant-details">
                    ${getDetailHTML('phone', restaurant.tags.phone, 'fa-phone')}
                    ${getDetailHTML('website', restaurant.tags.website, 'fa-globe', true)}
                    ${getDetailHTML('opening hours', restaurant.tags.opening_hours, 'fa-clock')}
                </div>
            `;

            resultsDiv.appendChild(card);
        });

        // Initial sort
        sortResults();
    }

    function formatAddress(restaurant) {
        let addr = restaurant.tags['addr:street'] || '';
        if (restaurant.tags['addr:housenumber']) {
            addr = `${restaurant.tags['addr:housenumber']} ${addr}`;
        }
        if (restaurant.tags['addr:city']) {
            addr += `, ${restaurant.tags['addr:city']}`;
        }
        return addr;
    }

    function getRatingHTML(restaurant) {
        if (!restaurant.tags['smoking'] && !restaurant.tags['wheelchair']) {
            return '';
        }
        
        let ratingHTML = '<div class="restaurant-rating">';
        
        if (restaurant.tags['smoking']) {
            ratingHTML += `<span><i class="fas ${restaurant.tags['smoking'] === 'no' ? 'fa-smoking-ban' : 'fa-smoking'}"></i> ${restaurant.tags['smoking']}</span> `;
        }
        
        if (restaurant.tags['wheelchair']) {
            ratingHTML += `<span><i class="fas fa-wheelchair"></i> ${restaurant.tags['wheelchair']}</span>`;
        }
        
        return ratingHTML + '</div>';
    }

    function getDetailHTML(label, value, icon, isLink = false) {
        if (!value) return '';
        
        if (isLink) {
            const href = value.startsWith('http') ? value : `https://${value}`;
            return `
                <div class="detail-item">
                    <i class="fas ${icon}"></i>
                    <a href="${href}" target="_blank">${label}</a>
                </div>
            `;
        }
        
        return `
            <div class="detail-item">
                <i class="fas ${icon}"></i>
                <span>${value}</span>
            </div>
        `;
    }

    function sortResults() {
        const sortBy = sortSelect.value;
        const cards = Array.from(resultsDiv.children);
        
        if (cards.length === 0) return;
        
        cards.sort((a, b) => {
            const aValue = a.querySelector('h3').textContent.toLowerCase();
            const bValue = b.querySelector('h3').textContent.toLowerCase();
            
            if (sortBy === 'name') {
                return aValue.localeCompare(bValue);
            } else if (sortBy === 'rating') {
                // Implement rating sort if available
                return 0; // Placeholder
            }
            return 0;
        });
        
        // Re-append sorted cards
        cards.forEach(card => resultsDiv.appendChild(card));
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