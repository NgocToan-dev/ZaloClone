(function(window){
    window.__env = window.__env || {};
    
    // API base URL
    window.__env.baseUrl = 'http://localhost:5000';
    
    // Default language
    window.__env.defaultLanguage = 'en';
    
    // Enable debug mode
    window.__env.debugMode = true;
    
    // Enable feature flags
    window.__env.featureFlags = {
        enableNewUI: true,
        enableBetaFeatures: false
    };
    
    // Set the environment name
    window.__env.environmentName = 'development';
    
    // Enable CORS support
    window.__env.enableCORS = true;
    
    // Set the maximum request timeout in milliseconds
    window.__env.requestTimeout = 30000;
})(this);