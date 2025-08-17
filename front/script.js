const showNotification = (message, type = "info") => {
  const container =
    document.querySelector(".notification-container") ||
    (() => {
      const c = document.createElement("div");
      c.className = "notification-container";
      document.body.appendChild(c);
      return c;
    })();

  const notif = document.createElement("div");
  notif.className = "notification";
  notif.setAttribute("data-type", type);
  notif.textContent = message;
  container.appendChild(notif);

  requestAnimationFrame(() => notif.classList.add("show"));

  setTimeout(() => {
    notif.classList.remove("show");
    notif.classList.add("hide");
    notif.addEventListener("transitionend", () => notif.remove(), {
      once: true,
    });
  }, 3000);
};

class Gallery {
  constructor(galleryId, apiUrl) {
    this.gallery = document.getElementById(galleryId);
    this.apiUrl = apiUrl;
    this.files = [];
    this.fileInput = document.getElementById("fileInput");
    this.uploadBtn = document.getElementById("uploadBtn");
    this.fileNameSpan = document.getElementById("fileName");
    this.init();
  }

  async init() {
    await this.fetchFiles();
    this.setupFileInput();
    this.setupUpload();
  }

  async fetchFiles() {
    try {
      const res = await fetch(this.apiUrl);
      this.files = await res.json();
      this.render();
    } catch {
      showNotification("Ошибка при загрузке списка файлов.", "error");
    }
  }

  addImage(file) {
    this.files.push(file);
    this.render();
    showNotification(`File "${file.filename}" uploaded!`, "success");
  }

  async deleteImage(filename) {
    try {
      const res = await fetch(
        `${this.apiUrl}/${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      this.files = this.files.filter((f) => f.filename !== filename);
      this.render();
      showNotification(`File "${filename}" deleted!`, "success");
    } catch {
      showNotification("Ошибка при удалении файла.", "error");
    }
  }

  render() {
    this.gallery.innerHTML = "";
    if (!this.files.length) {
      this.gallery.innerHTML = "<p>No images uploaded yet</p>";
      return;
    }

    this.files.forEach((file) => {
      const container = document.createElement("div");
      container.className = "image-container";

      const img = document.createElement("img");
      img.src = encodeURI(file.url);
      img.alt = file.filename;

      const caption = document.createElement("div");
      caption.className = "caption";
      caption.textContent = file.filename;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      `;
      deleteBtn.addEventListener("click", () =>
        this.deleteImage(file.filename)
      );

      container.append(img, caption, deleteBtn);
      this.gallery.appendChild(container);
    });
  }

  setupFileInput() {
    this.fileInput.addEventListener("change", () => {
      this.fileNameSpan.textContent = this.fileInput.files.length
        ? this.fileInput.files[0].name
        : "No file chosen";
    });
  }

  setupUpload() {
    this.uploadBtn.addEventListener("click", async () => {
      if (!this.fileInput.files.length) {
        showNotification("No file chosen!", "error");
        return;
      }
      const file = this.fileInput.files[0];
      const formData = new FormData();
      formData.append("file", file);

      const tempContainer = document.createElement("div");
      tempContainer.className = "image-container loading-container";

      const spinner = document.createElement("span");
      spinner.className = "spinner";

      const tempImg = document.createElement("img");
      tempImg.src = "";
      tempContainer.append(tempImg, spinner);
      this.gallery.appendChild(tempContainer);

      try {
        const res = await fetch("http://127.0.0.1:8000/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        this.addImage({ filename: file.name, url: data.url });
      } catch {
        showNotification("Ошибка при загрузке файла.", "error");
      } finally {
        tempContainer.remove();
        this.resetFileInput();
      }
    });
  }

  resetFileInput() {
    this.fileInput.value = "";
    this.fileNameSpan.textContent = "No file chosen";
  }
}

window.addEventListener(
  "DOMContentLoaded",
  () => new Gallery("gallery", "http://127.0.0.1:8000/files")
);
