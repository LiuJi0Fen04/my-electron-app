document.addEventListener('DOMContentLoaded', () => {
    // this loops over each element in the Nodelist 
    const clickableAreas = document.querySelectorAll('.clickable-area');

    clickableAreas.forEach(area => {
        area.addEventListener('click', () => {
            // shows a browser alert with the message 
            alert(`You clicked on ${area.textContent}`);
        });
    });
});