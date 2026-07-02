(function () {
  var labelsByLang = {
    en: {
      dialog: "Screenshot preview",
      close: "Close preview",
      prev: "Previous screenshot",
      next: "Next screenshot",
      scrollLeft: "Scroll screenshots left",
      scrollRight: "Scroll screenshots right"
    },
    ru: {
      dialog: "Просмотр скриншота",
      close: "Закрыть просмотр",
      prev: "Предыдущий скриншот",
      next: "Следующий скриншот",
      scrollLeft: "Прокрутить скриншоты влево",
      scrollRight: "Прокрутить скриншоты вправо"
    },
    ja: {
      dialog: "スクリーンショットのプレビュー",
      close: "プレビューを閉じる",
      prev: "前のスクリーンショット",
      next: "次のスクリーンショット",
      scrollLeft: "スクリーンショットを左へスクロール",
      scrollRight: "スクリーンショットを右へスクロール"
    }
  };

  var lang = (document.documentElement.lang || "en").split("-")[0];
  var labels = labelsByLang[lang] || labelsByLang.en;
  var activeLinks = [];
  var activeIndex = 0;
  var dialog;
  var dialogImage;
  var dialogCaption;

  function prefersIosScreenshots() {
    var platform = navigator.platform || "";
    var userAgent = navigator.userAgent || "";
    return /iPad|iPhone|iPod|Macintosh|MacIntel|MacPPC|Mac68K/.test(platform + " " + userAgent);
  }

  function getInitialPlatform(gallery) {
    var preferred = prefersIosScreenshots() ? "ios" : "android";
    if (gallery.querySelector('.shots[data-platform="' + preferred + '"]')) return preferred;
    var firstPanel = gallery.querySelector(".shots[data-platform]");
    return firstPanel ? firstPanel.dataset.platform : preferred;
  }

  function getActivePanel(gallery) {
    return gallery.querySelector(".shots:not([hidden])");
  }

  function setPlatform(gallery, platform) {
    var panels = Array.prototype.slice.call(gallery.querySelectorAll(".shots[data-platform]"));
    var tabs = Array.prototype.slice.call(gallery.querySelectorAll(".platform-tab[data-platform]"));
    var hasPlatform = panels.some(function (panel) {
      return panel.dataset.platform === platform;
    });

    if (!hasPlatform && panels[0]) platform = panels[0].dataset.platform;

    panels.forEach(function (panel) {
      var selected = panel.dataset.platform === platform;
      panel.hidden = !selected;
      panel.setAttribute("aria-hidden", selected ? "false" : "true");
      if (selected) panel.scrollLeft = 0;
    });

    tabs.forEach(function (tab) {
      var selected = tab.dataset.platform === platform;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });
  }

  function ensureDialog() {
    if (dialog || !("HTMLDialogElement" in window)) return dialog;

    function createIcon(paths) {
      var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "shot-dialog-icon");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");

      paths.forEach(function (pathData) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        svg.append(path);
      });

      return svg;
    }

    dialog = document.createElement("dialog");
    dialog.className = "shot-dialog";
    dialog.setAttribute("aria-label", labels.dialog);

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "shot-dialog-button shot-dialog-close";
    closeButton.setAttribute("aria-label", labels.close);
    closeButton.append(createIcon(["M18 6 6 18", "M6 6l12 12"]));

    var prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = "shot-dialog-button shot-dialog-prev";
    prevButton.setAttribute("aria-label", labels.prev);
    prevButton.append(createIcon(["m15 18-6-6 6-6"]));

    var nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "shot-dialog-button shot-dialog-next";
    nextButton.setAttribute("aria-label", labels.next);
    nextButton.append(createIcon(["m9 18 6-6-6-6"]));

    var figure = document.createElement("figure");
    figure.className = "shot-dialog-figure";

    dialogImage = document.createElement("img");
    dialogImage.className = "shot-dialog-image";
    dialogImage.alt = "";

    dialogCaption = document.createElement("figcaption");
    dialogCaption.className = "shot-dialog-caption";

    figure.append(dialogImage, dialogCaption);
    dialog.append(closeButton, prevButton, figure, nextButton);
    document.body.append(dialog);

    closeButton.addEventListener("click", function () {
      dialog.close();
    });
    prevButton.addEventListener("click", function () {
      showShot(activeIndex - 1);
    });
    nextButton.addEventListener("click", function () {
      showShot(activeIndex + 1);
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", function () {
      dialogImage.removeAttribute("src");
      dialogCaption.textContent = "";
      activeLinks = [];
    });

    document.addEventListener("keydown", function (event) {
      if (!dialog || !dialog.open) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showShot(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        showShot(activeIndex + 1);
      }
    });

    return dialog;
  }

  function showShot(index) {
    if (!activeLinks.length) return;

    if (index < 0) index = activeLinks.length - 1;
    if (index >= activeLinks.length) index = 0;
    activeIndex = index;

    var link = activeLinks[activeIndex];
    var preview = link.querySelector("img");
    var caption = link.closest("figure").querySelector("figcaption");

    dialogImage.src = link.href;
    dialogImage.alt = preview ? preview.alt : "";
    dialogCaption.textContent = caption ? caption.textContent : "";
  }

  function openShot(link) {
    var currentDialog = ensureDialog();
    if (!currentDialog) return false;

    var panel = link.closest(".shots");
    activeLinks = Array.prototype.slice.call(panel.querySelectorAll(".shot-link"));
    activeIndex = activeLinks.indexOf(link);
    showShot(activeIndex);
    currentDialog.showModal();
    return true;
  }

  function initGallery(gallery) {
    setPlatform(gallery, getInitialPlatform(gallery));

    gallery.querySelectorAll(".platform-tab[data-platform]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setPlatform(gallery, tab.dataset.platform);
      });
    });

    gallery.querySelectorAll(".gallery-arrow[data-direction]").forEach(function (button) {
      var direction = Number(button.dataset.direction) || 1;
      button.setAttribute("aria-label", direction < 0 ? labels.scrollLeft : labels.scrollRight);
      button.addEventListener("click", function () {
        var panel = getActivePanel(gallery);
        if (!panel) return;

        var amount = Math.max(panel.clientWidth * 0.85, 220);
        if (panel.scrollBy) {
          panel.scrollBy({ left: amount * direction, behavior: "smooth" });
        } else {
          panel.scrollLeft += amount * direction;
        }
      });
    });

    gallery.querySelectorAll(".shot-link").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (openShot(link)) event.preventDefault();
      });
    });
  }

  document.querySelectorAll("[data-screenshot-gallery]").forEach(initGallery);
}());
