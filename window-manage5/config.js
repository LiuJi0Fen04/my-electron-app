
// old1
// document.addEventListener('DOMContentLoaded', () => {
    // console.log('loaded config.js')
    // // this loops over each element in the Nodelist 
    // const clickableAreas = document.querySelectorAll('.clickable-area');

    // clickableAreas.forEach(area => {
    //     area.addEventListener('click', () => {
    //         // shows a browser alert with the message 
    //         alert(`You clicked on ${area.textContent}`);
    //     });
    // });
// });

// old2 twice click config cause error 'Identifier 'clickableAreas' has already been declared'
// console.log('loaded config.js')
// // this loops over each element in the Nodelist 
// const clickableAreas = document.querySelectorAll('.clickable-area');

// clickableAreas.forEach(area => {
//     area.addEventListener('click', () => {
//         // shows a browser alert with the message 
//         alert(`You clicked on ${area.textContent}`);
//     });
// });

// The Solution: Encapsulate Your Script with an IIFE
// The best practice for making external scripts self-contained and re-runnable is to wrap their code in an IIFE (Immediately Invoked Function Expression).
// An IIFE is a function that is defined and executed immediately. The key benefit is that it creates a private, temporary scope for your variables.


// This is an IIFE. The entire code is wrapped in a function that
// runs immediately, creating a private scope.
(() => {
    // Because 'clickableAreas' is now inside a function, it is not global.
    // It will be created and destroyed each time the script is loaded.
    const clickableAreas = document.querySelectorAll('.clickable-area');

    clickableAreas.forEach(area => {
        area.addEventListener('click', () => {
            // This logic remains the same.
            if (typeof showMessageBox === 'function') {
                showMessageBox(`You clicked on ${area.textContent}`);
            } else {
                alert(`You clicked on ${area.textContent}`);
            }
        });
    });
})(); // The final () invokes the function immediately.