        const currentLocation = location.href; 
        const menuItem = document.querySelectorAll('.menu a');
        for (let i = 0; i < menuItem.length; i++) {
            if (menuItem[i].href === currentLocation) {
                menuItem[i].classList.add('active');
            }
        }

        // Handle button redirects
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const link = btn.getAttribute('href');
                if (link) window.location.href = link;
            });
        });