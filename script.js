let db = {};
let currentCategory = ""; 
let editingBlockIndex = null;                   
let isAddingBlock = false;                      
let editingCategoryName = null;                 
let isAddingCategory = false;                   
let draggedCategoryKey = null;                  
let draggedBlockIndex = null;                   
let isInterfaceHidden = false;                  

function toggleHideInterface() {
    isInterfaceHidden = true;
    document.body.classList.add('interface-hidden');
}

document.addEventListener('click', (e) => {
    if (isInterfaceHidden) {
        isInterfaceHidden = false;
        document.body.classList.remove('interface-hidden');
        e.stopImmediatePropagation();
        e.preventDefault();
    }
}, true);

async function loadDb() {
    try {
        let res = await fetch('/api/db');

        if (res.status === 401) {
            document.getElementById('app-container').style.display = 'none';
            document.getElementById('login-screen').style.display = 'flex';
            setTimeout(() => {
                const passInput = document.getElementById('password-input');
                if (passInput) passInput.focus();
            }, 50);
            return;
        }

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';

        db = await res.json();
        
        const keys = Object.keys(db);
        if ((!currentCategory || !db[currentCategory]) && keys.length > 0) {
            currentCategory = keys[0];
        }
        
        render();
    } catch (err) {
        console.error('Ошибка загрузки данных с сервера:', err);
    }
}

async function submitLogin() {
    const passInput = document.getElementById('password-input');
    const errorEl = document.getElementById('login-error');
    const pass = passInput.value;

    try {
        const loginRes = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass })
        });

        if (loginRes.ok) {
            errorEl.innerText = "";
            passInput.value = "";
            loadDb(); 
        } else {
            errorEl.innerText = "Неверный пароль!";
            passInput.focus();
            passInput.select();
        }
    } catch (err) {
        console.error('Ошибка авторизации:', err);
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        const passInput = document.getElementById('password-input');
        if (passInput) {
            passInput.value = '';
            passInput.focus();
        }
    } catch (err) {
        console.error('Ошибка при выходе:', err);
    }
}

async function saveDb() {
    try {
        const res = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(db)
        });

        if (res.status === 401) {
            alert("Сессия истекла. Пожалуйста, войдите снова.");
            document.getElementById('app-container').style.display = 'none';
            document.getElementById('login-screen').style.display = 'flex';
        }
    } catch (err) {
        console.error('Ошибка сохранения на сервер:', err);
    }
}

function render() {
    const keys = Object.keys(db);
    if ((!currentCategory || !db[currentCategory]) && keys.length > 0) {
        currentCategory = keys[0];
    }

    renderCategories();
    renderBlocks();

    const hasActiveCategory = currentCategory && db[currentCategory];
    if (hasActiveCategory) {
        document.body.classList.add('has-active-category');
    } else {
        document.body.classList.remove('has-active-category');
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderCategories() {
    const listEl = document.getElementById('categories-list');
    listEl.innerHTML = ''; 

    const mobileSelectedEl = document.getElementById('mobile-selected-category');
    if (mobileSelectedEl) {
        mobileSelectedEl.innerText = currentCategory || "Выберите категорию";
    }

    if (isAddingCategory) {
        const addCatDiv = document.createElement('div');
        addCatDiv.style.marginBottom = '10px';
        addCatDiv.innerHTML = `
            <input type="text" id="new-cat-input" class="edit-input" placeholder="Имя категории" onkeydown="if(event.key === 'Enter') saveNewCategory(); if(event.key === 'Escape') cancelAddCategory();">
            <div class="edit-actions" style="margin-top: 4px;">
                <button class="btn-save" onclick="saveNewCategory()">Создать</button>
                <button class="btn-cancel" onclick="cancelAddCategory()">Отмена</button>
            </div>
        `;
        listEl.appendChild(addCatDiv);
    }

    Object.keys(db).forEach(cat => {
        const item = document.createElement('div');
        item.className = `category-item ${cat === currentCategory ? 'active' : ''}`;
        item.draggable = true; 

        item.addEventListener('dragstart', () => {
            draggedCategoryKey = cat; 
            item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedCategoryKey = null; 
        });
        item.addEventListener('dragover', (e) => e.preventDefault()); 
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            if (!draggedCategoryKey || draggedCategoryKey === cat) return;
            
            const keys = Object.keys(db);
            const oldIndex = keys.indexOf(draggedCategoryKey);
            const newIndex = keys.indexOf(cat);
            
            keys.splice(oldIndex, 1);
            keys.splice(newIndex, 0, draggedCategoryKey);
            
            const newDb = {};
            keys.forEach(k => newDb[k] = db[k]);
            db = newDb;
            saveDb();
            render();
        });

        if (editingCategoryName === cat) {
            item.className = 'category-item';
            item.draggable = false; 
            item.innerHTML = `
                <div style="width:140px">
                    <input type="text" id="edit-cat-input-${cat}" class="edit-input" value="${escapeHtml(cat)}" style="margin:0;" onkeydown="if(event.key === 'Enter') saveEditCategory('${cat}'); if(event.key === 'Escape') cancelEditCategory();">
                </div>
                <div class="edit-actions" style="margin:0; gap:4px;">
                    <button class="btn-save" onclick="saveEditCategory('${cat}')" title="Сохранить"><i data-lucide="check" class="icon"></i></button>
                    <button class="btn-cancel" onclick="cancelEditCategory()" title="Отмена"><i data-lucide="x" class="icon"></i></button>
                </div>
            `;
        } else {
            item.innerHTML = `
                <span class="category-name" onclick="selectCategory('${cat}')">${escapeHtml(cat)}</span>
                <div class="item-actions" onclick="event.stopPropagation()">
                    <button class="action-btn" onclick="startEditCategory('${cat}')" title="Редактировать"><i data-lucide="pencil" class="icon"></i></button>
                    <button class="action-btn" onclick="deleteCategory('${cat}')" title="Удалить"><i data-lucide="trash-2" class="icon"></i></button>
                </div>
            `;
        }
        listEl.appendChild(item);
    });
}

function selectCategory(cat) {
    currentCategory = cat;
    editingBlockIndex = null; 
    isAddingBlock = false;
    render();

    const listEl = document.getElementById('categories-list');
    if (listEl) {
        listEl.classList.remove('open');
        const sidebarTop = listEl.closest('.sidebar-top');
        if (sidebarTop) sidebarTop.classList.remove('menu-open');
    }
    const chevron = document.getElementById('mobile-chevron');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
}

function toggleMobileCategories() {
    const listEl = document.getElementById('categories-list');
    const chevron = document.getElementById('mobile-chevron');
    if (!listEl) return;
    
    listEl.classList.toggle('open');
    const sidebarTop = listEl.closest('.sidebar-top');
    if (sidebarTop) {
        sidebarTop.classList.toggle('menu-open', listEl.classList.contains('open'));
    }

    if (chevron) {
        chevron.style.transform = listEl.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
    }
}

function startAddCategory() {
    isAddingCategory = true;
    render();
    
    const listEl = document.getElementById('categories-list');
    if (listEl) {
        listEl.classList.add('open');
        const sidebarTop = listEl.closest('.sidebar-top');
        if (sidebarTop) sidebarTop.classList.add('menu-open');
    }
    const chevron = document.getElementById('mobile-chevron');
    if (chevron) chevron.style.transform = 'rotate(180deg)';

    setTimeout(() => {
        const inp = document.getElementById('new-cat-input');
        if (inp) inp.focus(); 
    }, 50);
}

function cancelAddCategory() {
    isAddingCategory = false;
    const listEl = document.getElementById('categories-list');
    if (listEl) {
        listEl.classList.remove('open');
        const sidebarTop = listEl.closest('.sidebar-top');
        if (sidebarTop) sidebarTop.classList.remove('menu-open');
    }
    render();
}

function saveNewCategory() {
    const inp = document.getElementById('new-cat-input');
    const name = inp ? inp.value.trim() : '';
    if (!name) { alert("Название не может быть пустым!"); return; }
    if (db[name]) { alert("Такая категория уже существует!"); return; }
    
    db[name] = []; 
    currentCategory = name; 
    isAddingCategory = false;
    saveDb();
    render();
}

function startEditCategory(cat) {
    editingCategoryName = cat;
    render();
    setTimeout(() => {
        const inp = document.getElementById(`edit-cat-input-${cat}`);
        if (inp) inp.focus();
    }, 50);
}

function cancelEditCategory() {
    editingCategoryName = null;
    render();
}

function saveEditCategory(oldName) {
    const inp = document.getElementById(`edit-cat-input-${oldName}`);
    const newName = inp ? inp.value.trim() : '';
    if (!newName) { alert("Название не может быть пустым!"); return; }
    if (newName !== oldName && db[newName]) { alert("Категория с таким именем уже существует!"); return; }

    const newDb = {};
    Object.keys(db).forEach(k => {
        if (k === oldName) {
            newDb[newName] = db[oldName];
        } else {
            newDb[k] = db[k];
        }
    });
    db = newDb;
    
    if (currentCategory === oldName) currentCategory = newName;
    editingCategoryName = null;
    saveDb();
    render();
}

function deleteCategory(cat) {
    if (confirm(`Удалить категорию "${cat}" и все ее блоки?`)) {
        delete db[cat];
        const keys = Object.keys(db);
        currentCategory = keys.length > 0 ? keys[0] : "";
        saveDb();
        render();
    }
}

function renderBlocks() {
    const gridEl = document.getElementById('blocks-grid');
    const titleEl = document.getElementById('category-title');
    const addBtnEl = document.getElementById('add-block-btn');
    
    gridEl.innerHTML = ''; 

    if (!currentCategory || !db[currentCategory]) {
        titleEl.innerText = "Выберите категорию";
        addBtnEl.style.display = 'none';
        return;
    }

    titleEl.innerText = currentCategory;
    addBtnEl.style.display = 'block';

    if (isAddingBlock) {
        const addCard = document.createElement('div');
        addCard.className = 'snippet-card';
        addCard.innerHTML = `
            <h3 style="margin-bottom: 8px; color: #1b79c5;">Новый блок</h3>
            <input type="text" id="new-block-title" class="edit-input" placeholder="Название блока" onkeydown="if(event.key === 'Enter') saveNewBlock(); if(event.key === 'Escape') cancelAddBlock();">
            <textarea id="new-block-code" class="edit-textarea" placeholder="Текст" onkeydown="if(event.key === 'Enter' && event.ctrlKey) saveNewBlock(); if(event.key === 'Escape') cancelAddBlock();"></textarea>
            <div class="edit-actions">
                <button class="btn-save" onclick="saveNewBlock()">Создать</button>
                <button class="btn-cancel" onclick="cancelAddBlock()">Отмена</button>
            </div>
        `;
        gridEl.appendChild(addCard);
    }

    const blocks = db[currentCategory];

    blocks.forEach((block, index) => {
        const card = document.createElement('div');
        card.className = 'snippet-card';
        card.draggable = true;

        card.addEventListener('dragstart', () => {
            draggedBlockIndex = index;
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            draggedBlockIndex = null;
        });
        card.addEventListener('dragover', (e) => e.preventDefault());
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedBlockIndex === null || draggedBlockIndex === index) return;

            const allBlocks = db[currentCategory];
            const movedItem = allBlocks.splice(draggedBlockIndex, 1)[0];
            allBlocks.splice(index, 0, movedItem);
            saveDb();
            render();
        });

        if (editingBlockIndex === index) {
            card.draggable = false;
            card.innerHTML = `
                <input type="text" id="edit-title-${index}" class="edit-input" value="${escapeHtml(block.title)}" placeholder="Название" onkeydown="if(event.key === 'Enter') saveEdit(${index}); if(event.key === 'Escape') cancelEdit();">
                <textarea id="edit-code-${index}" class="edit-textarea" placeholder="Код / текст" onkeydown="if(event.key === 'Enter' && event.ctrlKey) saveEdit(${index}); if(event.key === 'Escape') cancelEdit();">${escapeHtml(block.code)}</textarea>
                <div class="edit-actions">
                    <button class="btn-save" onclick="saveEdit(${index})">Сохранить</button>
                    <button class="btn-cancel" onclick="cancelEdit()">Отмена</button>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="card-header">
                    <h3>${escapeHtml(block.title)}</h3>
                    <div class="item-actions">
                        <button class="action-btn" onclick="startEdit(${index})" title="Редактировать"><i data-lucide="pencil" class="icon"></i></button>
                        <button class="action-btn" onclick="deleteBlock(${index})" title="Удалить"><i data-lucide="trash-2" class="icon"></i></button>
                    </div>
                </div>
                <code>${escapeHtml(block.code)}</code>
                <div class="card-footer">
                    <button class="btn-copy" onclick="copyToClipboard(${index})"><i data-lucide="copy" class="icon"></i> Копировать</button>
                </div>
            `;
        }
        gridEl.appendChild(card);
    });
}

function startAddBlock() {
    isAddingBlock = true;
    editingBlockIndex = null;
    render();
    setTimeout(() => {
        const inp = document.getElementById('new-block-title');
        if (inp) inp.focus();
    }, 50);
}

function cancelAddBlock() {
    isAddingBlock = false;
    render();
}

function saveNewBlock() {
    const titleInp = document.getElementById('new-block-title');
    const codeInp = document.getElementById('new-block-code');
    if (!titleInp.value.trim()) { alert("Название не может быть пустым!"); return; }
    
    db[currentCategory].push({
        title: titleInp.value.trim(),
        code: codeInp.value
    });
    isAddingBlock = false;
    saveDb();
    render();
}

function startEdit(index) {
    editingBlockIndex = index;
    isAddingBlock = false;
    render();
}

function cancelEdit() {
    editingBlockIndex = null;
    render();
}

function saveEdit(index) {
    const titleInp = document.getElementById(`edit-title-${index}`);
    const codeInp = document.getElementById(`edit-code-${index}`);
    if (!titleInp.value.trim()) { alert("Название не может быть пустым!"); return; }
    
    db[currentCategory][index].title = titleInp.value.trim();
    db[currentCategory][index].code = codeInp.value;
    editingBlockIndex = null;
    saveDb();
    render();
}

function deleteBlock(index) {
    if (confirm("Удалить этот блок?")) {
        db[currentCategory].splice(index, 1); 
        if (editingBlockIndex === index) editingBlockIndex = null;
        saveDb();
        render();
    }
}

function copyToClipboard(index) {
    const text = db[currentCategory][index].code;
    navigator.clipboard.writeText(text).then(() => {
        showToast(); 
    }).catch(err => {
        console.error('Ошибка копирования: ', err);
    });
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "memo_snippets_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click(); 
    downloadAnchor.remove();
}

function triggerImport() {
    document.getElementById('import-file').click();
}

function importData(event) {
    const fileReader = new FileReader();
    if (event.target.files[0]) {
        fileReader.readAsText(event.target.files[0], "UTF-8");
        fileReader.onload = (e) => {
            try {
                const importedDb = JSON.parse(e.target.result);
                if (typeof importedDb === 'object' && importedDb !== null) {
                    db = importedDb;
                    const keys = Object.keys(db);
                    currentCategory = keys.length > 0 ? keys[0] : "";
                    saveDb();
                    render();
                    alert("Сниппеты успешно импортированы!");
                } else {
                    alert("Ошибка: неверный формат файла.");
                }
            } catch (err) {
                alert("Ошибка при чтении файла JSON.");
            }
            event.target.value = ""; 
        };
    }
}

function showToast() {
    const toast = document.getElementById("toast");
    toast.className = "show";
    setTimeout(() => { 
        toast.className = toast.className.replace("show", ""); 
    }, 2000); 
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}


const bgVdo = document.getElementById('bgVdo');
if (bgVdo) {
    bgVdo.addEventListener('ended', () => {
        bgVdo.currentTime = 0;
        bgVdo.play();
    });
}

loadDb();