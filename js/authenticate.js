document.addEventListener("DOMContentLoaded", () => {
    document.body.style.display = "none"; // Hide content initially

    fetch('/auth/check')
        .then(response => response.json())
        .then(data => {
            if (!data.logged_in) {
                window.location.href = 'login.html';  // Redirect immediately if not logged in
            } else {
                document.body.style.display = "block"; // Show content once authenticated
            }
        })
        .catch(error => {
            console.error('Error checking authentication:', error);
            window.location.href = 'login.html'; // Ensure redirection on error
        });
});

function logoutUser() {
    fetch('/logout', { method: 'POST', credentials: 'same-origin' })
        .then(response => response.json())
        .then(data => {
            alert(data.message); // Show logout message
            window.location.href = '../html/login.html'; // Redirect to login
        })
        .catch(error => console.error('Logout failed:', error));
}
