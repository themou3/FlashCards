document.addEventListener('DOMContentLoaded', () => {
    const setsContainer = document.getElementById('setsContainer');
    const newSetButton = document.getElementById('newSet');
    const modalOverlay = document.getElementById('modalOverlay');
    const newSetNameInput = document.getElementById('newSetName');
    const saveSetButton = document.getElementById('saveSetButton');
    const popupForm = document.getElementById('popupForm');
    const setPopupForm = document.getElementById('setPopupForm');
    const defaultSet = document.getElementById('defaultSet');
    const closePopupButton = document.getElementById('closePopupButton');

    // Функция для отображения существующих наборов
    function loadSets() {
        fetch('/card-sets')
            .then(response => response.json())
            .then(data => {
                data.forEach(set => createSetElement(set.id, set.name));
            })
            .catch(error => console.error('Error loading sets:', error));
    }

    // Функция для создания HTML-элемента для набора
    function createSetElement(setId, setName) {
        const setElement = document.createElement('div');
        setElement.classList.add('tool-box');
        setElement.style.border = 'solid';
        setElement.dataset.setId = setId;

        const setNameElement = document.createElement('div');
        setNameElement.textContent = setName;
        setNameElement.classList.add('tool-name');

        setElement.appendChild(setNameElement);
        setsContainer.insertBefore(setElement, newSetButton);

        // Добавление обработчика клика
        setElement.addEventListener('click', () => openSetPopup(setId, setName));
    }

    // Функция для открытия попапа с деталями набора
    function openSetPopup(setId, setName) {
        // Запрос количества карточек в наборе
        fetch(`/card-sets/${setId}/cards/count`)
            .then(response => response.json())
            .then(data => {
                const cardCount = data.count;

                popupForm.querySelector('.popup-content').innerHTML = `
                    <h3>${setName}</h3>
                    ${setName != 'ALL' ? '<img class="delete-button" id="deleteButton" src="/static/trash.png"></img>' : ''}
                    <button class="popup-button" id="playButton" ${cardCount === 0 ? 'disabled' : ''}>Play</button>
                    <button class="popup-button" id="editButton">Edit</button>
                    <button class="popup-button" id="closePopupButton">Close</button>
                `;
                popupForm.classList.add('active');
                modalOverlay.classList.add('active');

                // Закрыть попап при клике на кнопку "Close"
                popupForm.querySelector('#closePopupButton').addEventListener('click', closePopup);

                // Обработчики кнопок "Play" и "Edit"
                const playButton = popupForm.querySelector('#playButton');
                const editButton = popupForm.querySelector('#editButton');

                playButton.addEventListener('click', () => {
                    if (setId === 'default') {
                        window.location.href = '/play/all';
                    } else {
                        window.location.href = `/play/${setId}`;
                    }
                });

                editButton.addEventListener('click', () => {
                    if (setId === 'default') {
                        window.location.href = '/edit/all';
                    } else {
                        window.location.href = `/edit/${setId}`;
                    }
                });

                // Обработчик для кнопки "Delete"
                const deleteButton = popupForm.querySelector('#deleteButton');
                if (deleteButton) {
                    deleteButton.addEventListener('click', async () => {
                        if (confirm(`Are you sure you want to delete the set "${setName}" and all its cards?`)) {
                            try {
                                const response = await fetch(`/delete-card-set/${setId}`, {
                                    method: 'DELETE',
                                });
                                if (response.ok) {
                                    closePopup();
                                    const setElement = setsContainer.querySelector(`[data-set-id="${setId}"]`);
                                    if (setElement) {
                                        setsContainer.removeChild(setElement);
                                    }
                                } else {
                                    const error = await response.json();
                                    alert(error.error || 'Error deleting card set.');
                                }
                            } catch (error) {
                                console.error('Error deleting card set:', error);
                            }
                        }
                    });
                }
            })
            .catch(error => console.error('Error loading set details:', error));
    }

    // Функция для открытия попапа добавления нового набора
    function openNewSetPopup() {
        setPopupForm.classList.add('active');
        modalOverlay.classList.add('active');
    }

    // Функция для закрытия любого попапа
    function closePopup() {
        document.querySelectorAll('.popup').forEach(popup => popup.classList.remove('active'));
        modalOverlay.classList.remove('active');
    }

    // Обработчик для кнопки Default Set
    defaultSet.addEventListener('click', () => openSetPopup('default', 'ALL'));

    // Сохранение нового набора
    saveSetButton.addEventListener('click', () => {
        const setName = newSetNameInput.value.trim();
        if (setName) {
            fetch('/card-sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: setName }),
            })
                .then(response => response.json())
                .then(newSet => {
                    createSetElement(newSet.id, newSet.name);
                    newSetNameInput.value = ''; // Очистка поля ввода
                    closePopup(); // Закрытие попапа
                })
                .catch(error => console.error('Error adding set:', error));
        } else {
            alert('Please enter a valid set name.');
        }
    });


    newSetButton.addEventListener('click', openNewSetPopup);

    closePopupButton.addEventListener('click', closePopup);

    // Закрытие попапа при клике на оверлей
    modalOverlay.addEventListener('click', closePopup);

    // Загрузка существующих наборов
    loadSets();
});
