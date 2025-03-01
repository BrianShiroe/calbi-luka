document.addEventListener("DOMContentLoaded", function () {
    const wrapper = document.querySelector(".weather-cards-wrapper");
    document.querySelector(".prev").addEventListener("click", () => {
        wrapper.scrollBy({ left: -200, behavior: "smooth" });
    });
    document.querySelector(".next").addEventListener("click", () => {
        wrapper.scrollBy({ left: 200, behavior: "smooth" });
    });
});
