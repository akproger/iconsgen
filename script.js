// Размеры сеток
const gridSizes = [16, 32, 64, 128, 150, 180, 192, 256, 512];
const startValues = {
    16: 1,
    32: 2,
    64: 4,
    128: 8,
    150: 10,
    180: 15,
    192: 8,
    256: 16,
    512: 32,
}; // Начальные значения для каждой сетки
const containerSize = 256; // Размер отображаемого контейнера фиксирован: 256x256 px

// Глобальная переменная для изображения
const image = new Image(); // Создаем объект для изображения

// Библиотека JSZip для создания архива
const zip = new JSZip();

// Переменная для хранения ссылок на контейнеры сеток
let gridContainers = {};

// Сброс приложения
function resetApp() {
    // Удаляем все элементы внутри appContainer
    appContainer.innerHTML = "";
    // Сбрасываем ссылки на сетки
    gridContainers = {};
}

// Создание контейнеров для всех сеток
const appContainer = document.createElement("div");
appContainer.className = "main-div";
document.body.appendChild(appContainer);

// Функция для генерации динамических шагов (до трех шагов)
function generateDynamicSteps(startValue) {
    return [startValue, startValue * 2, startValue * 4];
}

// Функция для создания интерфейса сетки
function createGridInterface(gridSize, steps, titlePosition) {
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "20px";
    wrapper.style.width = "512px";
    wrapper.className = "icon-wrapper";

    // Заголовок для сетки
    const title = document.createElement("h3");
    title.textContent = `${gridSize}x${gridSize}`;
    title.className = `t-${gridSize}`;
    title.style.top = `${titlePosition}px`; // Позиционирование заголовка
    title.style.cursor = "pointer"; // Добавляем указатель
    wrapper.appendChild(title);

    // Контейнер для отображения сетки
    const gridContainer = document.createElement("div");
    gridContainer.style.width = `${gridSize}px`;
    gridContainer.style.height = `${gridSize}px`;
    gridContainer.style.display = "grid";
    gridContainer.className = "icon-grid hidden";
    wrapper.appendChild(gridContainer);

    // Сохраняем данные о сетке
    gridContainers[gridSize] = { container: gridContainer, title, steps, gridSize };

    // Добавляем элемент на страницу
    appContainer.appendChild(wrapper);

    return gridContainer;
}

// Создание HTML/CSS копии сетки
function generateHtmlCssGrid(gridSize, cellSize, container) {
    container.innerHTML = ""; // Очищаем предыдущую сетку

    // Устанавливаем размеры сетки
    const columns = gridSize / cellSize;
    container.style.gridTemplateColumns = `repeat(${columns}, ${cellSize}px)`;
    container.style.gridTemplateRows = `repeat(${columns}, ${cellSize}px)`;

    // Преобразуем изображение в данные
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = gridSize;
    canvas.height = gridSize;

    // Рисуем изображение в канвас для получения пикселей
    ctx.drawImage(image, 0, 0, gridSize, gridSize);
    const imageData = ctx.getImageData(0, 0, gridSize, gridSize);

    for (let y = 0; y < gridSize; y += cellSize) {
        for (let x = 0; x < gridSize; x += cellSize) {
            // Вычисляем средний цвет для ячейки
            const averageColor = getAverageColor(imageData, x, y, cellSize);

            // Создаем элемент ячейки
            const cell = document.createElement("div");
            cell.style.width = `${cellSize}px`;
            cell.style.height = `${cellSize}px`;
            cell.style.backgroundColor = `rgb(${averageColor.r}, ${averageColor.g}, ${averageColor.b})`;

            // Добавляем ячейку в контейнер
            container.appendChild(cell);
        }
    }
}

// Управление видимостью сеток
function setupTitleClickHandlers() {
    const titles = document.querySelectorAll(".icon-wrapper h3");
    const grids = document.querySelectorAll(".icon-grid");

    titles.forEach((title, index) => {
        title.addEventListener("click", () => {
            grids.forEach((grid, gridIndex) => {
                if (gridIndex === index) {
                    grid.classList.remove("hidden");
                    title.classList.add("active"); // Добавляем класс active для заголовка
                } else {
                    grid.classList.add("hidden");
                    titles[gridIndex].classList.remove("active"); // Убираем active у других
                }
            });
        });
    });
}

// Генерация SVG для текущей сетки
function generateSvgForGrid(gridSize, cellSize, container) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", gridSize);
    svg.setAttribute("height", gridSize);
    svg.setAttribute("xmlns", svgNS);

    const cells = container.children;
    Array.from(cells).forEach((cell, index) => {
        const rect = document.createElementNS(svgNS, "rect");
        const row = Math.floor(index / (gridSize / cellSize));
        const col = index % (gridSize / cellSize);

        rect.setAttribute("x", col * cellSize);
        rect.setAttribute("y", row * cellSize);
        rect.setAttribute("width", cellSize);
        rect.setAttribute("height", cellSize);
        rect.setAttribute("fill", cell.style.backgroundColor);

        svg.appendChild(rect);
    });

    return svg.outerHTML;
}

// Вычисление среднего цвета ячейки
function getAverageColor(imageData, startX, startY, size) {
    const { data, width, height } = imageData;
    let r = 0,
        g = 0,
        b = 0,
        count = 0;

    for (let y = startY; y < startY + size && y < height; y++) {
        for (let x = startX; x < startX + size && x < width; x++) {
            const index = (y * width + x) * 4;
            r += data[index];
            g += data[index + 1];
            b += data[index + 2];
            count++;
        }
    }

    return {
        r: Math.floor(r / count),
        g: Math.floor(g / count),
        b: Math.floor(b / count),
    };
}

// Сохранение всех сеток в ZIP
function saveAllGridsAsZip() {
    const promises = [];

    // Перебираем контейнеры сеток
    Object.entries(gridContainers).forEach(([gridSize, { container, steps }]) => {
        const cellSize = steps[0]; // Минимальный размер ячейки

        // Генерация и добавление SVG в ZIP
        const svgCode = generateSvgForGrid(gridSize, cellSize, container);
        zip.file(`icon-${gridSize}x${gridSize}.svg`, svgCode);

        // Добавляем PNG в ZIP
        promises.push(
            html2canvas(container, {
                width: parseInt(gridSize, 10),
                height: parseInt(gridSize, 10),
                scale: 1,
            }).then((canvas) => {
                const dataUrl = canvas.toDataURL("image/png");
                const base64 = dataUrl.split(",")[1];

                // Сохраняем PNG с обычным именем
                zip.file(`icon-${gridSize}x${gridSize}.png`, base64, { base64: true });

                // Проверка и сохранение дополнительных файлов
                if (parseInt(gridSize, 10) === 32) {
                    console.log("Сохраняем favicon.ico");
                    zip.file("favicon.ico", base64, { base64: true });
                }
                if (parseInt(gridSize, 10) === 150) {
                    console.log("Сохраняем mstile-150x150.png");
                    zip.file("mstile-150x150.png", base64, { base64: true });
                }
                if (parseInt(gridSize, 10) === 180) {
                    console.log("Сохраняем apple-touch-icon.png");
                    zip.file("apple-touch-icon.png", base64, { base64: true });
                }
                if (parseInt(gridSize, 10) === 192) {
                    console.log("Сохраняем icon-192.png");
                    zip.file("icon-192.png", base64, { base64: true });
                }
                if (parseInt(gridSize, 10) === 256) {
                    console.log("Сохраняем safari-pinned-tab.svg");
                    zip.file("safari-pinned-tab.svg", svgCode);
                }
            })
        );
    });

    // Добавляем manifest.json
    const manifest = {
        name: "",
        short_name: "",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // Добавляем browserconfig.xml
    const browserconfig = `
<?xml version="1.0" encoding="utf-8"?>
<browserconfig>
  <msapplication>
    <tile>
      <square150x150logo src="/mstile-150x150.png"/>
      <TileColor>#da532c</TileColor>
    </tile>
  </msapplication>
</browserconfig>`;
    zip.file("browserconfig.xml", browserconfig);

    // Генерация архива ZIP
    Promise.all(promises).then(() => {
        zip.generateAsync({ type: "blob" }).then((content) => {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = "all-files.zip";
            link.click();
        });
    });
}

// Обработчик загрузки файла
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        image.src = reader.result; // Устанавливаем источник изображения
    };
    reader.readAsDataURL(file);

    // После загрузки изображения вызываем генерацию всех сеток
    image.onload = () => {
        resetApp(); // Сбрасываем приложение перед новой генерацией

        let titlePosition = 0; // Инициализация вертикального позиционирования заголовков
        gridSizes.forEach((gridSize) => {
            // titlePosition += 40; // Инкрементируем положение заголовка
            const steps = generateDynamicSteps(startValues[gridSize]);
            const container = createGridInterface(gridSize, steps, titlePosition);
            generateHtmlCssGrid(gridSize, startValues[gridSize], container); // Генерация с минимальными значениями
        });

        // Устанавливаем обработчики для заголовков
        setupTitleClickHandlers();

        // Делаем последнюю сетку видимой по умолчанию
        const lastGridKey = gridSizes[gridSizes.length - 1];
        gridContainers[lastGridKey].container.classList.remove("hidden");
        gridContainers[lastGridKey].title.classList.add("active");

        // Добавляем общую кнопку для сохранения всех сеток
        const saveAllButton = document.createElement("button");
        saveAllButton.textContent = "Сохранить все";
        saveAllButton.addEventListener("click", saveAllGridsAsZip);
        appContainer.appendChild(saveAllButton);

        let codeForCopy = document.querySelector(".code-for-include");
        codeForCopy.style.display = "inline-table";
        codeForCopy.addEventListener("click", function(){
            this.select();
            document.execCommand('copy')
        })
    };
}

// Привязка загрузки файла
upload.addEventListener("change", handleImageUpload);
