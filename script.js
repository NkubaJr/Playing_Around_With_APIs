document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const regionFilter = document.getElementById('region-filter');
    const sortBtn = document.getElementById('sort-btn');
    const resultsContainer = document.getElementById('results-container');
    const loadingElement = document.getElementById('loading');
    
    let countries = [];
    let sortAscending = false; // Default sort: high to low population
    
    // Initialize the app
    fetchCountries();
    
    // Event listeners
    searchBtn.addEventListener('click', filterCountries);
    regionFilter.addEventListener('change', filterCountries);
    sortBtn.addEventListener('click', toggleSort);
    
    // Fetch countries from REST Countries API (no API key needed)
    async function fetchCountries() {
        loadingElement.style.display = 'block';
        resultsContainer.innerHTML = '';
        
        try {
            const response = await fetch('https://restcountries.com/v3.1/all');
            
            if (!response.ok) {
                throw new Error('Failed to fetch countries');
            }
            
            const data = await response.json();
            countries = data.map(country => ({
                name: country.name.common,
                officialName: country.name.official,
                capital: country.capital ? country.capital[0] : 'N/A',
                region: country.region,
                subregion: country.subregion,
                population: country.population,
                languages: country.languages ? Object.values(country.languages).join(', ') : 'N/A',
                flag: country.flags.png,
                currency: country.currencies ? Object.values(country.currencies)[0].name : 'N/A'
            }));
            
            displayCountries(countries);
            
        } catch (error) {
            console.error('Error fetching countries:', error);
            resultsContainer.innerHTML = '<p class="error">Failed to load countries. Please try again later.</p>';
        } finally {
            loadingElement.style.display = 'none';
        }
    }
    
    // Display countries in the UI
    function displayCountries(countriesToDisplay) {
        resultsContainer.innerHTML = '';
        
        if (countriesToDisplay.length === 0) {
            resultsContainer.innerHTML = '<p class="no-results">No countries found matching your criteria.</p>';
            return;
        }
        
        countriesToDisplay.forEach(country => {
            const card = document.createElement('div');
            card.className = 'country-card';
            
            // Format population with commas
            const formattedPopulation = country.population.toLocaleString();
            
            card.innerHTML = `
                <img src="${country.flag}" alt="${country.name} flag" class="country-flag">
                <div class="country-info">
                    <h3>${country.name}</h3>
                    <p><strong>Official Name:</strong> ${country.officialName}</p>
                    <p><strong>Capital:</strong> ${country.capital}</p>
                    <p><strong>Region:</strong> ${country.region} ${country.subregion ? `(${country.subregion})` : ''}</p>
                    <p><strong>Population:</strong> ${formattedPopulation}</p>
                    <p><strong>Languages:</strong> ${country.languages}</p>
                    <p><strong>Currency:</strong> ${country.currency}</p>
                </div>
            `;
            
            resultsContainer.appendChild(card);
        });
    }
    
    // Filter countries based on search and filters
    function filterCountries() {
        const searchTerm = searchInput.value.toLowerCase();
        const region = regionFilter.value;
        
        let filtered = countries.filter(country => {
            const matchesSearch = country.name.toLowerCase().includes(searchTerm) || 
                                 country.officialName.toLowerCase().includes(searchTerm);
            const matchesRegion = region === '' || country.region === region;
            
            return matchesSearch && matchesRegion;
        });
        
        // Apply current sort
        filtered.sort((a, b) => {
            return sortAscending ? a.population - b.population : b.population - a.population;
        });
        
        displayCountries(filtered);
    }
    
    // Toggle sort order
    function toggleSort() {
        sortAscending = !sortAscending;
        sortBtn.textContent = sortAscending ? 'Sort by Population (Low to High)' : 'Sort by Population (High to Low)';
        
        const currentSearch = searchInput.value.toLowerCase();
        const currentRegion = regionFilter.value;
        filterCountries(); // This will reapply filters and the new sort
    }
});