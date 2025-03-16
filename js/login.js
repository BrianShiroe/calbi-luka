const container = document.getElementById('container');
const registerBtn = document.getElementById('register');
const loginBtn = document.getElementById('login');

registerBtn.addEventListener('click', () => {
    container.classList.add("active");
});

loginBtn.addEventListener('click', () => {
    container.classList.remove("active");
});

document.addEventListener("DOMContentLoaded", function () {
    const loginBtn = document.querySelector(".login-btn");
    const signUpBtn = document.querySelector(".sign-up-btn");

    function showError(inputId, message) {
        const inputField = document.getElementById(inputId);
        let errorElement = inputField.nextElementSibling;

        if (!errorElement || !errorElement.classList.contains("error-message")) {
            errorElement = document.createElement("p");
            errorElement.classList.add("error-message");
            errorElement.style.color = "red";
            errorElement.style.fontSize = "12px";
            errorElement.style.marginTop = "5px";
            inputField.parentNode.insertBefore(errorElement, inputField.nextSibling);
        }

        errorElement.textContent = message;
    }

    function clearErrors() {
        document.querySelectorAll(".error-message").forEach(el => el.remove());
    }

    function validateInput(input, type) {
        const specialCharPattern = /[!@#$%^&*(),.?":{}|<>]/g;
        if (type === "email") {
            return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(input);
        } else if (type === "password") {
            return input.length >= 6; // Minimum password length
        } else {
            return !specialCharPattern.test(input) && input.length > 0; // Restrict special characters and empty username
        }
    }

    loginBtn.addEventListener("click", function (event) {
        event.preventDefault(); // Prevent unintended redirection
        clearErrors();
        
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value.trim();

        let isValid = true;

        if (!validateInput(email, "email")) {
            showError("login-email", "Invalid email format.");
            isValid = false;
        }

        if (!validateInput(password, "password")) {
            showError("login-password", "Password must be at least 6 characters long.");
            isValid = false;
        }

        if (isValid) {
            window.location.href = "home.html";
        }
    });

    signUpBtn.addEventListener("click", function (event) {
        event.preventDefault(); // Prevent unintended redirection
        clearErrors();
        
        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("register-email").value.trim();
        const password = document.getElementById("register-password").value.trim();

        let isValid = true;

        if (!validateInput(username, "text")) {
            showError("username", "Username must not contain special characters and cannot be empty.");
            isValid = false;
        }

        if (!validateInput(email, "email")) {
            showError("register-email", "Invalid email format.");
            isValid = false;
        }

        if (!validateInput(password, "password")) {
            showError("register-password", "Password must be at least 6 characters long.");
            isValid = false;
        }

        if (isValid) {
            alert("Account created successfully!");
            window.location.href = "login.html";
        }
    });
});
