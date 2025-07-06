const setId = window.SET_ID;

document.addEventListener('DOMContentLoaded', () => {
    const cardContainer = document.getElementById('cardContainer');
    const saveButton = document.getElementById('saveButton');
    
    async function loadCard(setId) {
        try {
            const response = await fetch(`/get-cards/${setId}`);
            if (response.ok) {
                const cards = await response.json(); // Expecting a list of cards
                const cardContainer = document.querySelector('.container');
                
                // Loop through cards and create templates for each
                cards.forEach(card => {
                    const cardTemplate = createCardTemplate({
                        front: card.front_text,
                        back: card.back_text,
                        isLearned: card.is_learned,
                        id: card.id,
                        setId: card.card_set_id
                    });
                    cardContainer.appendChild(cardTemplate);
                });
    
                // Add one empty template at the end for new cards
                cardContainer.appendChild(createCardTemplate());
            } else {
                alert('Error loading card');
            }
        } catch (error) {
            console.error('Error fetching card:', error);
        }
    }

    // Функция для создания нового шаблона карточки
    function createCardTemplate(cardData = { front: '', back: '', isLearned: false, id: null, cardSetId: null }) {
        const card = document.createElement('div');
        card.classList.add('edit-card');
        card.dataset.cardId = cardData.id || '';
        card.dataset.cardSetId = cardData.setId || '';

        const frontInput = document.createElement('input');
        frontInput.type = 'text';
        frontInput.placeholder = 'Front Side';
        frontInput.className = 'front-input';
        frontInput.value = cardData.front;

        const backInput = document.createElement('input');
        backInput.type = 'text';
        backInput.placeholder = 'Back Side';
        backInput.className = 'back-input';
        backInput.value = cardData.back;

        const likeButton = document.createElement('button');
        likeButton.className = 'like-btn';
        //likeButton.src = '/static/heart.png';
        likeButton.textContent = cardData.isLearned ? '❤️' : '🖤';
        likeButton.addEventListener('click', () => {
            cardData.isLearned = !cardData.isLearned;
            likeButton.textContent = cardData.isLearned ? '❤️' : '🖤';
            enableSaveButton();
        });

        const deleteButton = document.createElement('img');
        deleteButton.className = 'delete-btn';
        deleteButton.src = '/static/trash.png';
        deleteButton.addEventListener('click', async () => {
            if (cardData.id) {
                // Если у карточки есть ID, отправляем запрос на удаление
                try {
                    const response = await fetch(`/delete-card/${cardData.id}`, {
                        method: 'DELETE',
                    });

                    if (response.ok) {
                        cardContainer.removeChild(card);
                    } else {
                        const errorData = await response.json();
                        alert(`Error deleting card: ${errorData.error}`);
                    }
                } catch (error) {
                    console.error('Error deleting card:', error);
                }
            } else {
                // Если карточка не сохранена, просто удаляем из DOM
                cardContainer.removeChild(card);
            }
        });

        [frontInput, backInput].forEach(input => {
            input.addEventListener('input', () => enableSaveButton());
            input.addEventListener('focus', () => {
                const emptyCardExists = [...cardContainer.children].some(
                    child =>
                        child.querySelector('.front-input').value.trim() === '' &&
                        child.querySelector('.back-input').value.trim() === ''
                );
                if (!emptyCardExists) {
                    cardContainer.appendChild(createCardTemplate());
                }
            });
        });

        card.appendChild(frontInput);
        card.appendChild(backInput);
        card.appendChild(likeButton);
        card.appendChild(deleteButton);

        return card;
    }

    // Включение кнопки Save
    function enableSaveButton() {
        saveButton.classList.add('active');
        saveButton.disabled = false;
    }

    // Обработчик для кнопки Save
    saveButton.addEventListener('click', async () => {
        const cards = [...cardContainer.querySelectorAll('.edit-card')].map(card => ({
            id: card.dataset.cardId || null,
            front: card.querySelector('.front-input').value.trim(),
            back: card.querySelector('.back-input').value.trim(),
            isLearned: card.querySelector('.like-btn').textContent === '❤️',
            setId: card.dataset.cardSetId || null
        })).filter(card => card.front || card.back); // Исключить пустые карточки

        if (cards.length === 0) {
            alert('No valid cards to save!');
            return;
        }

        try {
            const response = await fetch('/save-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cards, card_set_id: setId })
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message);

                saveButton.classList.remove('active');
                saveButton.disabled = true;

                cardContainer.innerHTML = '';
                loadCard(setId);
            } else {
                alert('Error saving changes.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });

    // Добавить пустой шаблон при загрузке страницы
    window.onload = async () => {
        loadCard(setId);
    };
});
