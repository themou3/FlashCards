const card = document.querySelectorAll('.card');
const setId = window.SET_ID;

card.forEach(card => {
    card.addEventListener('click', () => {
        card.classList.toggle('flipped');  // Переворачиваем карту
    });
});

// Функция для загрузки карты по card_id
async function loadCard(card_id) {
    try {
        const response = await fetch(`/get-card/${card_id}`);
        if (response.ok) {
            const card = await response.json();
            const cardContainer = document.querySelector('.card-container');

            cardContainer.querySelector('.cardId').textContent = card.id;
            cardContainer.querySelector('.front').textContent = card.front_text;
            cardContainer.querySelector('.back').textContent = card.back_text;
            cardContainer.querySelector('.liked').textContent = card.is_learned ? '❤️' : '';
        } else {
            alert('Error loading card');
        }
    } catch (error) {
        console.error('Error fetching card:', error);
    }
}

// Функция для загрузки случайной карты
async function nextId(setId) {
    try {
        const response = await fetch(`/next-card/${setId}`);
        if (response.ok) {
            const cardData = await response.json();
            return cardData.id;  // Возвращаем card_id
        } else {
            alert('No more cards available!');
        }
    } catch (error) {
        console.error('Error fetching random card:', error);
    }
}
// Обработчик для кнопки Skip
document.querySelector('.skip-btn').addEventListener('click', async () => {
    const cardElement = document.querySelector('.cardAnimation');
    const card = document.querySelector('.card');
    cardElement.classList.add('shake');
    const newCardId = await nextId(setId);  // Получаем новый card_id
    card.classList.remove('flipped');
    loadCard(newCardId);  // Загружаем новую карту
    cardElement.addEventListener('animationend', () => {
        cardElement.classList.remove('shake');
    }, { once: true });
});

// Обработчик для кнопки Like
document.querySelector('.like-btn').addEventListener('click', async () => {
    const cardId = document.querySelector('.cardId').textContent;
    const cardContainer = document.querySelector('.card-container');
    const cardElement = document.querySelector('.cardAnimation');

    try {
        // Отправляем запрос для обновления статуса лайка
        const response = await fetch(`/toggle-like/${cardId}`, {
            method: 'POST',
        });

        if (response.ok) {
            const cardData = await response.json();
            cardElement.classList.add('zoom');
            loadCard(cardId);  // Перезагружаем текущую карту
        } else {
            alert('Error while updating like status');
        }
    } catch (error) {
        console.error('Error:', error);
    }

    cardElement.addEventListener('animationend', () => {
        cardElement.classList.remove('zoom');
    }, { once: true });
});

// Загружаем случайную карту при загрузке страницы
window.onload = async () => {
    const ID = await nextId(setId);  // Получаем случайный card_id
    loadCard(ID);  // Загружаем карту по полученному card_id
};