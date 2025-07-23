document.addEventListener('DOMContentLoaded', function() {
    let state = { recipes: [], baseResources: [], baseProduction: {}, productionGoals: {}, productionCategories: [] };
    let defaultCategory = {
        name: 'База',
        productions: [],
        baseResources: []
    };

    // --- Серверное хранилище ---
    const SERVER_URL = '/data'; // Важно: относительный путь для Render!
    async function loadStateFromServer() {
        try {
            const res = await fetch(SERVER_URL);
            if (!res.ok) throw new Error('Server error');
            const data = await res.json();
            if (data && Object.keys(data).length > 0) {
                state = data;
                return true;
            }
        } catch (e) {}
        return false;
    }
    async function saveStateToServer() {
        try {
            await fetch(SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
        } catch (e) {}
    }
    async function loadState() {
        const loaded = await loadStateFromServer();
        if (!loaded) {
            try {
                const savedState = JSON.parse(localStorage.getItem('satisfactoryCalculatorState'));
                if (savedState && savedState.recipes && savedState.baseResources) { state = savedState; }
                else { state.recipes = JSON.parse(JSON.stringify(window.recipes || [])); state.baseResources = JSON.parse(JSON.stringify(window.baseResources || [])); }
            } catch (e) {
                state.recipes = JSON.parse(JSON.stringify(window.recipes || [])); state.baseResources = JSON.parse(JSON.stringify(window.baseResources || []));
            }
        }
        state.baseProduction = state.baseProduction || {};
        state.productionGoals = state.productionGoals || {};
        state.productionCategories = state.productionCategories || [];
        if (state.productionCategories.length === 0) {
            defaultCategory.baseResources = state.baseResources.map(name => ({ name, rate: (state.baseProduction && state.baseProduction[name]) || 0 }));
            defaultCategory.productions = Object.keys(state.productionGoals || {}).map(recipeName => ({ recipeName, rate: state.productionGoals[recipeName]?.rate || 0 }));
            state.productionCategories = [defaultCategory];
        }
    }
    async function saveState() {
        try { localStorage.setItem('satisfactoryCalculatorState', JSON.stringify(state)); } catch (e) {}
        await saveStateToServer();
    }

    // --- UI и логика калькулятора ---
    // (Весь твой старый код ниже без изменений)

    // --- Поддержка новой вкладки "Карта ЖД Дороги" ---
    const allTabs = document.querySelectorAll('.tab-btn');
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            allTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            allTabContents.forEach(content => content.classList.remove('active'));
            const tabId = tab.id.replace('-btn', '');
            document.getElementById(tabId).classList.add('active');
        });
    });

    const tabs = document.querySelectorAll('.tab-btn'); const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => { tab.addEventListener('click', () => { tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); tabContents.forEach(content => content.classList.remove('active')); document.getElementById(tab.id.replace('-btn', '')).classList.add('active'); }); });
    function getAllResourceNames() { const recipeProducts = state.recipes.map(r => r.name).filter(Boolean); const allNames = [...new Set([...state.baseResources, ...recipeProducts])]; return allNames.sort(); }
    function renderRecipesTable() {
        const table = document.querySelector("#recipes-table"); const allResourceNames = getAllResourceNames();
        table.innerHTML = `<thead><tr><th>Название продукта</th><th>Ресурс 1</th><th>Потребление 1 (ед/мин)</th><th>Ресурс 2</th><th>Потребление 2 (ед/мин)</th><th>Ресурс 3</th><th>Потребление 3 (ед/мин)</th><th>Ресурс 4</th><th>Потребление 4 (ед/мин)</th><th>Выход (ед/мин)</th><th>Действие</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody'); tbody.innerHTML = '';
        // Сортировка рецептов по алфавиту
        const sortedRecipes = [...state.recipes].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
        sortedRecipes.forEach((recipe, index) => {
            const row = document.createElement('tr'); row.dataset.recipeIndex = state.recipes.indexOf(recipe);
            const ingredients = recipe.ingredients || []; while (ingredients.length < 4) { ingredients.push({ name: '', rate: '' }); }
            const createSelect = (ingredient, prop) => { const selectedName = ingredient?.name || ''; return `<select data-prop="${prop}"><option value="">-- нет --</option>${allResourceNames.map(name => `<option value="${name}" ${name === selectedName ? 'selected' : ''}>${name}</option>`).join('')}</select>`; };
            row.innerHTML = `<td contenteditable="true" data-prop="name">${recipe.name || ''}</td><td>${createSelect(ingredients[0], 'ing1_name')}</td><td contenteditable="true" data-prop="ing1_rate">${ingredients[0]?.rate || ''}</td><td>${createSelect(ingredients[1], 'ing2_name')}</td><td contenteditable="true" data-prop="ing2_rate">${ingredients[1]?.rate || ''}</td><td>${createSelect(ingredients[2], 'ing3_name')}</td><td contenteditable="true" data-prop="ing3_rate">${ingredients[2]?.rate || ''}</td><td>${createSelect(ingredients[3], 'ing4_name')}</td><td contenteditable="true" data-prop="ing4_rate">${ingredients[3]?.rate || ''}</td><td contenteditable="true" data-prop="product_rate">${recipe.product?.rate || ''}</td><td><button class="delete-btn" data-recipe-index="${state.recipes.indexOf(recipe)}">Удалить</button></td>`;
            tbody.appendChild(row);
        });
    }
    function renderBaseResourcesTable() {
        const table = document.querySelector("#base-resources-table");
        table.innerHTML = `<thead><tr><th>Ресурс</th><th>Производство (ед/мин)</th><th>Потребление (авто)</th><th>Остаток (авто)</th><th class="action-col">Действие</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody'); tbody.innerHTML = '';
        state.baseResources.forEach((resource, index) => {
            const row = document.createElement('tr'); row.dataset.resourceName = resource;
            row.innerHTML = `<td>${resource}</td><td><input type="number" min="0" value="${state.baseProduction[resource] || 0}" data-resource-prod="${resource}"></td><td data-consumption>0</td><td data-balance>0</td><td class="action-col"><button class="delete-btn" data-base-resource-index="${index}">Удалить</button></td>`;
            tbody.appendChild(row);
        });
    }
    function renderProductionTable() {
        const table = document.querySelector("#production-table");
        table.innerHTML = `<thead><tr><th>Ресурс</th><th>Производство (ед/мин)</th><th>Потребление (авто)</th><th>Остаток (авто)</th><th class="action-col">Действие</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody'); tbody.innerHTML = '';
        const complexItems = [...new Set(state.recipes.map(r => r.name).filter(Boolean))];
        complexItems.forEach(item => {
            const goal = state.productionGoals[item] || { rate: 0 };
            const row = document.createElement('tr'); row.dataset.resourceName = item;
            row.innerHTML = `<td>${item}</td><td><input type="number" min="0" value="${goal.rate}" data-item-rate="${item}"></td><td data-consumption>0</td><td data-balance>0</td><td class="action-col"></td>`;
            tbody.appendChild(row);
        });
    }
    function renderProductionCategories() {
        const container = document.getElementById('production-categories-container');
        container.innerHTML = '';
        if (!state.productionCategories) return;
        state.productionCategories.forEach((cat, catIdx) => {
            const catDiv = document.createElement('div');
            catDiv.className = 'production-category';
            catDiv.innerHTML = `<h3>${cat.name}<button class="del-cat-btn" data-del-cat="${catIdx}" title="Удалить категорию" style="float:right;font-size:1.2em;background:none;border:none;color:#b00;cursor:pointer;">✕</button></h3>`;
            // Таблица производств
            const table = document.createElement('table');
            table.innerHTML = `<thead><tr><th>Рецепт</th><th>Производство (ед/мин)</th><th>Потребление (авто)</th><th>Остаток (авто)</th><th class="action-col">Действие</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');
            // Сортировка производств по алфавиту
            const sortedProductions = [...cat.productions].sort((a, b) => (a.recipeName || '').localeCompare(b.recipeName || '', 'ru'));
            sortedProductions.forEach((prod, prodIdx) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${prod.recipeName}</td><td><input type="number" min="0" value="${prod.rate}" data-cat-prod="${catIdx}:${cat.productions.indexOf(prod)}"></td><td data-consumption>0</td><td data-balance>0</td><td class="action-col"><button data-del-prod="${catIdx}:${cat.productions.indexOf(prod)}" class="del-prod-btn">Удалить</button></td>`;
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            catDiv.appendChild(table);
            // Контейнер для select
            const selectContainer = document.createElement('div');
            selectContainer.className = 'add-select-container';
            catDiv.appendChild(selectContainer);
            // Кнопка добавить производство ПОД таблицей
            const addProdBtn = document.createElement('button');
            addProdBtn.textContent = 'Добавить производство';
            addProdBtn.className = 'action-btn';
            addProdBtn.style.marginTop = '8px';
            addProdBtn.onclick = () => {
                selectContainer.innerHTML = '';
                const select = document.createElement('select');
                select.innerHTML = '<option value="">-- Выбрать рецепт --</option>' + state.recipes.map(r => `<option value="${r.name}">${r.name}</option>`).join('');
                select.onchange = () => {
                    if (select.value) {
                        cat.productions.push({ recipeName: select.value, rate: 0 });
                        saveAndRedraw();
                    }
                };
                selectContainer.appendChild(select);
                select.focus();
            };
            catDiv.appendChild(addProdBtn);
            container.appendChild(catDiv);
        });
        // Кнопка добавить категорию (только одна внизу)
        const addCatBtn = document.createElement('button');
        addCatBtn.textContent = 'Добавить локацию';
        addCatBtn.className = 'action-btn';
        addCatBtn.onclick = () => {
            const name = prompt('Название локации:');
            if (name && !state.productionCategories.find(c => c.name === name)) {
                state.productionCategories.push({ name, productions: [], baseResources: [] });
                saveAndRedraw();
            }
        };
        container.appendChild(addCatBtn);
    }

    function renderBaseResourcesCategories() {
        const container = document.getElementById('base-resources-categories-container');
        container.innerHTML = '';
        if (!state.productionCategories) return;
        state.productionCategories.forEach((cat, catIdx) => {
            const catDiv = document.createElement('div');
            catDiv.className = 'base-resource-category';
            catDiv.innerHTML = `<h3>${cat.name}<button class="del-cat-btn" data-del-cat="${catIdx}" title="Удалить категорию" style="float:right;font-size:1.2em;background:none;border:none;color:#b00;cursor:pointer;">✕</button></h3>`;
            // Таблица ресурсов
            const table = document.createElement('table');
            table.innerHTML = `<thead><tr><th>Ресурс</th><th>Производство (ед/мин)</th><th>Потребление (авто)</th><th>Остаток (авто)</th><th class="action-col">Действие</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');
            cat.baseResources.forEach((res, resIdx) => {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${res.name}</td><td><input type="number" min="0" value="${res.rate}" data-cat-br="${catIdx}:${resIdx}"></td><td data-consumption>0</td><td data-balance>0</td><td class="action-col"><button data-del-br="${catIdx}:${resIdx}" class="del-br-btn">Удалить</button></td>`;
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            catDiv.appendChild(table);
            // Контейнер для select
            const selectContainer = document.createElement('div');
            selectContainer.className = 'add-select-container';
            catDiv.appendChild(selectContainer);
            // Кнопка добавить ресурс ПОД таблицей
            const addResBtn = document.createElement('button');
            addResBtn.textContent = 'Добавить ресурс';
            addResBtn.className = 'action-btn';
            addResBtn.style.marginTop = '8px';
            addResBtn.onclick = () => {
                selectContainer.innerHTML = '';
                const select = document.createElement('select');
                select.innerHTML = '<option value="">-- Выбрать ресурс --</option>' + state.baseResources.map(r => `<option value="${r}">${r}</option>`).join('');
                select.onchange = () => {
                    if (select.value && !cat.baseResources.find(res => res.name === select.value)) {
                        cat.baseResources.push({ name: select.value, rate: 0 });
                        saveAndRedraw();
                    }
                };
                selectContainer.appendChild(select);
                select.focus();
            };
            catDiv.appendChild(addResBtn);
            container.appendChild(catDiv);
        });
        // Кнопка добавить категорию (только одна внизу)
        const addCatBtn = document.createElement('button');
        addCatBtn.textContent = 'Добавить локацию';
        addCatBtn.className = 'action-btn';
        addCatBtn.onclick = () => {
            const name = prompt('Название локации:');
            if (name && !state.productionCategories.find(c => c.name === name)) {
                state.productionCategories.push({ name, productions: [], baseResources: [] });
                saveAndRedraw();
            }
        };
        container.appendChild(addCatBtn);
    }

    // Для блока базовых ресурсов в рецептах
    function renderBaseResourcesList() {
        const tbody = document.getElementById('base-resources-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        // Сортировка ресурсов по алфавиту
        const sortedResources = [...state.baseResources].sort((a, b) => a.localeCompare(b, 'ru'));
        sortedResources.forEach((res, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${res}</td><td><button class="del-base-resource-btn" data-base-resource-idx="${state.baseResources.indexOf(res)}" title="Удалить ресурс">Удалить</button></td>`;
            tbody.appendChild(tr);
        });
    }

    // Обработчики для удаления категорий и производств, изменения количества
    document.addEventListener('click', e => {
        if (e.target.classList.contains('del-cat-btn')) {
            const idx = +e.target.dataset.delCat;
            state.productionCategories.splice(idx, 1);
            saveAndRedraw();
        }
        if (e.target.classList.contains('del-prod-btn')) {
            const [catIdx, prodIdx] = e.target.dataset.delProd.split(':').map(Number);
            state.productionCategories[catIdx].productions.splice(prodIdx, 1);
            saveAndRedraw();
        }
        if (e.target.classList.contains('del-br-btn')) {
            const [catIdx, resIdx] = e.target.dataset.delBr.split(':').map(Number);
            state.productionCategories[catIdx].baseResources.splice(resIdx, 1);
            saveAndRedraw();
        }
        if (e.target.classList.contains('del-base-resource-btn')) {
            const idx = +e.target.dataset.baseResourceIdx;
            state.baseResources.splice(idx, 1);
            saveAndRedraw();
        }
    });
    document.addEventListener('input', e => {
        if (e.target.dataset.catProd) {
            const [catIdx, prodIdx] = e.target.dataset.catProd.split(':').map(Number);
            state.productionCategories[catIdx].productions[prodIdx].rate = parseFloat(e.target.value) || 0;
            saveAndRedraw(false);
        }
        if (e.target.dataset.catBr) {
            const [catIdx, resIdx] = e.target.dataset.catBr.split(':').map(Number);
            state.productionCategories[catIdx].baseResources[resIdx].rate = parseFloat(e.target.value) || 0;
            saveAndRedraw(false);
        }
    });

    document.getElementById('add-recipe-btn').addEventListener('click', () => { state.recipes.push({ name: 'Новый продукт', ingredients: [], product: { rate: 0 } }); saveAndRedraw(); });
    document.getElementById('add-base-resource-btn').addEventListener('click', () => { const input = document.getElementById('new-base-resource-name'); const name = input.value.trim(); if (name && !state.baseResources.includes(name)) { state.baseResources.push(name); input.value = ''; saveAndRedraw(); } });
    document.querySelector('#recipes-table').addEventListener('click', (e) => { if (e.target.classList.contains('delete-btn')) { state.recipes.splice(e.target.dataset.recipeIndex, 1); saveAndRedraw(); } });
    document.querySelector('#base-resources-table').addEventListener('click', (e) => { if (e.target.classList.contains('delete-btn')) { const resourceName = state.baseResources[e.target.dataset.baseResourceIndex]; state.baseResources.splice(e.target.dataset.baseResourceIndex, 1); delete state.baseProduction[resourceName]; saveAndRedraw(); } });
    const recipeTable = document.querySelector('#recipes-table');
    recipeTable.addEventListener('focusout', (e) => { if (e.target.hasAttribute('contenteditable')) { const row = e.target.parentElement; const index = row.dataset.recipeIndex; const prop = e.target.dataset.prop; let value = e.target.textContent.trim(); const recipe = state.recipes[index]; if (!recipe) return; if (prop === 'name') { recipe.name = value; saveAndRedraw(); } else { if (prop === 'product_rate') { if (!recipe.product) recipe.product = {}; recipe.product.rate = parseFloat(value) || 0; } else { const ingIndex = parseInt(prop.charAt(3)) - 1; if (!recipe.ingredients) recipe.ingredients = []; while (recipe.ingredients.length <= ingIndex) recipe.ingredients.push({}); recipe.ingredients[ingIndex].rate = parseFloat(value) || 0; } saveAndRedraw(false); } } });
    recipeTable.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') { const row = e.target.closest('tr'); const index = row.dataset.recipeIndex; const prop = e.target.dataset.prop; const value = e.target.value; const recipe = state.recipes[index]; if (!recipe) return; const ingIndex = parseInt(prop.charAt(3)) - 1; if (!recipe.ingredients) recipe.ingredients = []; while (recipe.ingredients.length <= ingIndex) recipe.ingredients.push({}); recipe.ingredients[ingIndex].name = value; if (!value) { recipe.ingredients[ingIndex].rate = ''; const rateCell = row.querySelector(`[data-prop="ing${ingIndex + 1}_rate"]`); if (rateCell) rateCell.textContent = ''; } saveAndRedraw(false); } });
    document.querySelector('#base-resources-table').addEventListener('input', e => { if (e.target.dataset.resourceProd) { state.baseProduction[e.target.dataset.resourceProd] = parseFloat(e.target.value) || 0; saveAndRedraw(false); } });
    document.querySelector('#production-table').addEventListener('input', e => { if (e.target.dataset.itemRate) { const item = e.target.dataset.itemRate; if (!state.productionGoals[item]) state.productionGoals[item] = {}; state.productionGoals[item].rate = parseFloat(e.target.value) || 0; saveAndRedraw(false); } });
    function updateCalculations() {
        if (!state.productionCategories) return;
        state.productionCategories.forEach((cat, catIdx) => {
            // Собираем список всех ресурсов в категории
            const allResources = [
                ...cat.baseResources.map(r => r.name),
                ...cat.productions.map(p => p.recipeName)
            ];
            const demands = {};
            const supplies = {};
            allResources.forEach(r => { demands[r] = 0; supplies[r] = 0; });

            // supplies для production (рецептов)
            cat.productions.forEach(prod => {
                if (prod.rate > 0) {
                    supplies[prod.recipeName] += prod.rate;
                }
            });
            // demands для прямых ингредиентов production (без рекурсии)
            cat.productions.forEach(prod => {
                if (prod.rate > 0) {
                    const recipe = state.recipes.find(r => r.name === prod.recipeName);
                    if (recipe && recipe.product && recipe.product.rate > 0 && recipe.ingredients) {
                        const multiplier = prod.rate / recipe.product.rate;
                        recipe.ingredients.forEach(ing => {
                            if (ing.name && ing.rate) {
                                demands[ing.name] = (demands[ing.name] || 0) + ing.rate * multiplier;
                            }
                        });
                    }
                }
            });
            // supplies для базовых ресурсов
            cat.baseResources.forEach(res => {
                supplies[res.name] += res.rate || 0;
            });
            // Обновляем таблицы (ищем только строки этой категории)
            // Производство
            const prodCatDivs = document.querySelectorAll('.production-category');
            if (prodCatDivs[catIdx]) {
                const rows = prodCatDivs[catIdx].querySelectorAll('table tbody tr');
                cat.productions.forEach((prod, prodIdx) => {
                    const row = rows[prodIdx];
                    if (row) {
                        let consumption = demands[prod.recipeName] || 0;
                        let balance = (supplies[prod.recipeName] || 0) - consumption;
                        // Добавим ячейки если их нет
                        if (!row.querySelector('[data-consumption]')) {
                            const td = document.createElement('td');
                            td.setAttribute('data-consumption', '');
                            row.insertBefore(td, row.children[2]);
                        }
                        if (!row.querySelector('[data-balance]')) {
                            const td = document.createElement('td');
                            td.setAttribute('data-balance', '');
                            row.appendChild(td);
                        }
                        row.querySelector('[data-consumption]').textContent = consumption.toFixed(2);
                        row.querySelector('[data-balance]').textContent = balance.toFixed(2);
                        row.querySelector('[data-balance]').classList.toggle('shortage', balance < -0.01);
                    }
                });
            }
            // Базовые ресурсы
            const baseCatDivs = document.querySelectorAll('.base-resource-category');
            if (baseCatDivs[catIdx]) {
                const rows = baseCatDivs[catIdx].querySelectorAll('table tbody tr');
                cat.baseResources.forEach((res, resIdx) => {
                    const row = rows[resIdx];
                    if (row) {
                        let consumption = demands[res.name] || 0;
                        let balance = (supplies[res.name] || 0) - consumption;
                        // Добавим ячейки если их нет
                        if (!row.querySelector('[data-consumption]')) {
                            const td = document.createElement('td');
                            td.setAttribute('data-consumption', '');
                            row.insertBefore(td, row.children[2]);
                        }
                        if (!row.querySelector('[data-balance]')) {
                            const td = document.createElement('td');
                            td.setAttribute('data-balance', '');
                            row.appendChild(td);
                        }
                        row.querySelector('[data-consumption]').textContent = consumption.toFixed(2);
                        row.querySelector('[data-balance]').textContent = balance.toFixed(2);
                        row.querySelector('[data-balance]').classList.toggle('shortage', balance < -0.01);
                    }
                });
            }
        });
    }
    function saveAndRedraw(fullRedraw = true) { saveState(); if (fullRedraw) { renderAll(); } updateCalculations(); }
    function renderAll() { renderRecipesTable(); renderBaseResourcesList(); renderBaseResourcesCategories(); renderProductionCategories(); }
    loadState().then(() => {
        renderAll();
        updateCalculations();
    });

    // --- Полноэкранная карта ---
    const mainMapImg = document.getElementById('main-map-img');
    const mapModal = document.getElementById('map-modal');
    const modalMapImg = document.getElementById('modal-map-img');
    const closeMapModal = document.getElementById('close-map-modal');
    if (mainMapImg && mapModal && modalMapImg && closeMapModal) {
        function closeMap() {
            mapModal.style.display = 'none';
            document.body.style.overflow = '';
            modalMapImg.style.transform = '';
        }
        mainMapImg.addEventListener('click', function() {
            mapModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
        closeMapModal.addEventListener('click', closeMap);
        mapModal.addEventListener('click', function(e) {
            if (e.target === mapModal) closeMap();
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && mapModal.style.display === 'flex') closeMap();
        });
    }
}); 