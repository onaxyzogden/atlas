if (window.lucide) {
  window.lucide.createIcons({
    attrs: {
      "stroke-width": 1.7
    }
  });
}

document.querySelectorAll(".rail-item").forEach((item) => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".rail-item").forEach((button) => button.classList.remove("active"));
    item.classList.add("active");
  });
});

document.querySelectorAll("button").forEach((button) => {
  button.addEventListener("pointerdown", () => button.classList.add("pressed"));
  button.addEventListener("pointerup", () => button.classList.remove("pressed"));
  button.addEventListener("pointerleave", () => button.classList.remove("pressed"));
});
