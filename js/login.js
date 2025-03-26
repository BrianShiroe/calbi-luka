document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("container");
    const registerBtn = document.getElementById("register");
    const loginBtn = document.getElementById("login");
    const loginSubmitBtn = document.querySelector(".login-btn");
    const signUpSubmitBtn = document.querySelector(".sign-up-btn");

    // Toggle login/signup view
    [registerBtn, loginBtn].forEach((btn, index) => {
        if (btn) btn.addEventListener("click", () => container.classList.toggle("active", index === 0));
    });

    // Show error messages
    const showError = (inputId, message) => {
        const inputField = document.getElementById(inputId);
        if (!inputField) return;

        let errorElement = inputField.nextElementSibling;
        if (!errorElement || !errorElement.classList.contains("error-message")) {
            errorElement = document.createElement("p");
            errorElement.classList.add("error-message");
            Object.assign(errorElement.style, { color: "red", fontSize: "12px" });
            inputField.insertAdjacentElement("afterend", errorElement);
        }
        errorElement.textContent = message;
        inputField.style.border = "2px solid red";
    };

    // Clear error messages
    const clearErrors = () => {
        document.querySelectorAll(".error-message").forEach(el => el.remove());
        document.querySelectorAll("input").forEach(input => input.style.border = "");
    }

    // Validate input fields
    const validateInput = (input, type) => {
        if (!input) return false;
    
        const patterns = {
            username: /^[a-zA-Z0-9_-]{3,16}$/,
            email: /^(?!.*\.{2})[a-zA-Z0-9._%+-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/,
            password: /^(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/
        };
    
        return patterns[type]?.test(input.trim()) || false;
    };
    
    // Handle form submission to Flask backend
    const handleSubmit = async (fields, apiUrl, redirectUrl) => {
        clearErrors();
        let isValid = true;
        let formData = {};
    
        fields.forEach(({ id, type, errorMsg }) => {
            const inputField = document.getElementById(id);
            if (!inputField) return;
    
            const value = inputField.value.trim();
            if (!validateInput(value, type)) {
                showError(id, errorMsg);
                isValid = false;
            }
            formData[id.replace("register-", "").replace("login-", "")] = value; // Normalize field names
        });
    
        // Confirm password validation
        const passwordField = document.getElementById("register-password");
        const confirmPasswordField = document.getElementById("confirm-password");
        if (passwordField && confirmPasswordField && passwordField.value !== confirmPasswordField.value) {
            showError("confirm-password", "Passwords do not match.");
            isValid = false;
        }
    
        if (!isValid) return;
    
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
    
            const data = await response.json();
            if (response.ok) {
                // alert(data.message);
                window.location.href = redirectUrl;
            } else {
                showError(fields[0].id, data.error);
            }
        } catch (error) {
            console.error("Error:", error);
            showError(fields[0].id, "Something went wrong. Please try again.");
        }
    };
    
    // Event listeners for login and sign-up
    loginSubmitBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        handleSubmit([
            { id: "login-email", type: "email", errorMsg: "Invalid email format." },
            { id: "login-password", type: "password", errorMsg: "Password must be at least 6 characters long and contain 1 special character." }
        ], "/login", "home.html");
    });
    
    signUpSubmitBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        handleSubmit([
            { id: "username", type: "username", errorMsg: "Username must be 3-16 characters (letters, numbers, _ or -)." },
            { id: "register-email", type: "email", errorMsg: "Invalid email format." },
            { id: "register-password", type: "password", errorMsg: "Password must be at least 6 characters long and contain 1 special character." }
        ], "/register", "login.html");
    });
});
