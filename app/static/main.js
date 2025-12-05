const button = document.getElementById('colorButton');

button.addEventListener('click', () => {
    fetch('/api/random_color')
        .then(response => response.json())
        .then(data => {
            button.style.backgroundColor = data.color;
        })
        .catch(err => console.error(err));
});
