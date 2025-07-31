# Use Nginx to serve your static files
FROM nginx:alpine

# Copy your HTML/CSS/JS into the web root
COPY . /usr/share/nginx/html

# Expose port 80 (default for web)
EXPOSE 80
