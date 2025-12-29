// Authentication Check
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
} else {
    console.log('User is authenticated with token:', token);
}

let bar = document.querySelector("#loading-bar");
let progress = document.querySelector("#progress");
let mbused = document.querySelector("#mbused");
let reporter = document.querySelector("p > span");

// progress.style.width = 50 + "%";
// reporter.textContent = 50;



// State
let currentFolderId = null;
let currentFileId = null;
let folders = [];
let files = [];

// DOM Elements
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const filesList = document.getElementById('filesList');
const emptyState = document.getElementById('emptyState');
const folderList = document.getElementById('folderList');
const currentLocation = document.getElementById('currentLocation');
const logoutBtn = document.getElementById('logoutBtn');
const createFolderBtn = document.getElementById('createFolderBtn');
const createYearFolderBtn = document.getElementById('createYearFolderBtn');
const userGreeting = document.getElementById('userGreeting');

// Modals
const folderModal = document.getElementById('folderModal');
const overrideModal = document.getElementById('overrideModal');
const folderNameInput = document.getElementById('folderName');
const saveFolderBtn = document.getElementById('saveFolderBtn');
const cancelFolderBtn = document.getElementById('cancelFolderBtn');
const overrideFileInput = document.getElementById('overrideFileInput');
const overrideFileName = document.getElementById('overrideFileName');
const saveOverrideBtn = document.getElementById('saveOverrideBtn');
const cancelOverrideBtn = document.getElementById('cancelOverrideBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const username = localStorage.getItem('username');
    if (username) {
        userGreeting.textContent = `Hello, ${username}`;
    }

    loadFolders();
    loadFiles();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // File Upload
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFileUpload(files);
    });

    // Logout
    logoutBtn.addEventListener('click', logout);

    // Create Folder
    createFolderBtn.addEventListener('click', () => openModal(folderModal));
    saveFolderBtn.addEventListener('click', createFolder);
    cancelFolderBtn.addEventListener('click', () => closeModal(folderModal));

    // Create Year Folders
    // createYearFolderBtn.addEventListener('click', createYearFolders);

    // Override Modal
    cancelOverrideBtn.addEventListener('click', () => closeModal(overrideModal));
    saveOverrideBtn.addEventListener('click', overrideFile);

    // Close modals on X click
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(folderModal);
            closeModal(overrideModal);
        });
    });

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === folderModal) closeModal(folderModal);
        if (e.target === overrideModal) closeModal(overrideModal);
    });
}

// API Calls
async function apiCall(url, options = {}) {
    try {
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            ...options.headers
        };

        // If the body is present and is not FormData, ensure a JSON Content-Type
        const isFormData = options.body instanceof FormData;
        const hasContentTypeHeader = options.headers && (options.headers['Content-Type'] || options.headers['content-type']);

        if (!isFormData && !hasContentTypeHeader && options.body !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        console.log("Headers:", headers, "isFormData:", isFormData);

        const fetchOptions = { ...options, headers };
        const response = await fetch(url, fetchOptions);

        if (response.status === 401) {
            logout();
            return null;
        }

        let usedStorage = localStorage.getItem('usedStorage');
        if (usedStorage) {
            mbused.textContent = usedStorage;
            let usedPercent = (parseFloat(usedStorage) / 200) * 100;
            progress.style.width = usedPercent + "%";
            // reporter.textContent = usedPercent;
        }

        const data = await response.json();
        console.log("Response data:", data);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        alert('An error occurred. Please try again.');
        return null;
    }
}

// Load Folders
async function loadFolders() {
    const data = await apiCall('/api/folders');
    if (data) {
        folders = data.folders;
        renderFolders();
    }
}

// Render Folders
function renderFolders() {
    folderList.innerHTML = folders.map(folder => `
        <button class="folder-item" data-folder-id="${folder._id}" onclick="selectFolder('${folder._id}', '${folder.name}')">
            📁 ${folder.name}
            <span class="delete-folder" onclick="event.stopPropagation(); deleteFolder('${folder._id}')">×</span>
        </button>
    `).join('');

    // Highlight active folder
    document.querySelectorAll('.folder-item').forEach(item => {
        if (item.dataset.folderId === currentFolderId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Select Folder
function selectFolder(folderId, folderName) {
    currentFolderId = folderId || null;
    currentLocation.textContent = folderName || 'All Files';

    document.querySelectorAll('.folder-item').forEach(item => {
        if (item.dataset.folderId === folderId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    loadFiles();
}

// Create Folder
async function createFolder() {
    const name = folderNameInput.value.trim();

    if (!name) {
        alert('Please enter a folder name');
        return;
    }

    const data = await apiCall('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });

    if (data) {
        folderNameInput.value = '';
        closeModal(folderModal);
        loadFolders();
    }
}

// Create Year Folders
async function createYearFolders() {
    const currentYear = new Date().getFullYear();
    const years = [];

    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        years.push(i.toString());
    }

    for (const year of years) {
        await apiCall('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: year })
        });
    }

    alert('Year folders created successfully!');
    loadFolders();
}

// Delete Folder
async function deleteFolder(folderId) {
    if (!confirm('Are you sure you want to delete this folder and all its files?')) {
        return;
    }

    const data = await apiCall(`/api/folders/${folderId}`, { method: 'DELETE' });

    if (data) {
        if (currentFolderId === folderId) {
            selectFolder('', 'All Files');
        }
        loadFolders();
    }
}

// Load Files
async function loadFiles() {
    const url = currentFolderId
        ? `/api/files?folderId=${currentFolderId}`
        : '/api/files';

    const data = await apiCall(url);

    if (data) {
        files = data.files;
        renderFiles();
    }
}

// Render Files
function renderFiles() {
    if (files.length === 0) {
        filesList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    filesList.innerHTML = files.map(file => {
        const icon = getFileIcon(file.mimetype);
        const size = formatFileSize(file.size);
        const date = new Date(file.uploadedAt).toLocaleDateString();

        return `
            <div class="file-card">
                <div class="file-icon">${icon}</div>
                <div class="info-con">
                    <div class="file-name">${file.originalName}</div>
                    <div class="file-info">${size} • ${date}</div>
                </div>
                <div class="file-actions">
                    <button class="btn-action btn-download" onclick="downloadFile('${file._id}', '${file.originalName}')">
                        Download
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteFile('${file._id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Get File Icon
function getFileIcon(mimetype) {
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return '📊';
    if (mimetype.includes('zip') || mimetype.includes('rar')) return '📦';
    return '📎';
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Handle File Select
function handleFileSelect(e) {
    const files = e.target.files;
    handleFileUpload(files);
    fileInput.value = '';
}

// Handle File Upload
async function handleFileUpload(files) {
    for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        if (currentFolderId) {
            formData.append('folderId', currentFolderId);
        }

        const data = await apiCall('/api/files/upload', {
            method: 'POST',
            body: formData
        });

        if (data) {
            console.log('File uploaded:', data.file.originalName);
        }
    }

    loadFiles();
}

// Download File
async function downloadFile(fileId, filename) {
    const url = `/api/files/download/${fileId}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } else {
            alert('Failed to download file');
        }
    } catch (error) {
        console.error('Download error:', error);
        alert('An error occurred while downloading');
    }
}

// Open Override Modal
function openOverrideModal(fileId, filename) {
    currentFileId = fileId;
    overrideFileName.textContent = filename;
    openModal(overrideModal);
}

// Override File
async function overrideFile() {
    const file = overrideFileInput.files[0];

    if (!file) {
        alert('Please select a file');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const data = await apiCall(`/api/files/${currentFileId}`, {
        method: 'PUT',
        body: formData
    });

    if (data) {
        overrideFileInput.value = '';
        closeModal(overrideModal);
        loadFiles();
    }
}

// Delete File
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    const data = await apiCall(`/api/files/${fileId}`, { method: 'DELETE' });

    if (data) {
        loadFiles();
    }
}

// Modal Functions
function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

// Logout
async function logout() {
    await apiCall('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/';
}