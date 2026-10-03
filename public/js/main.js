/**
 * TaskFlow - Interactive Morphing Card Stack & Gesture Physics
 */

let currentLayout = 'stack'; // 'stack' | 'grid' | 'list'
let activeStackIndex = 0;
let isCardDragging = false;
let startPointerX = 0;
let startPointerY = 0;
let currentDeltaX = 0;
let activeDragCard = null;

document.addEventListener('DOMContentLoaded', () => {
    initMorphingStack();
    initSearch();
    initKeyboardNav();
});

/**
 * Initialize Layout & Card Stack
 */
function initMorphingStack() {
    const savedMode = localStorage.getItem('task_layout_mode') || 'stack';
    setLayoutMode(savedMode);
}

/**
 * Switch layout between 'stack', 'grid', and 'list'
 */
function setLayoutMode(mode) {
    currentLayout = mode;
    localStorage.setItem('task_layout_mode', mode);

    const wrapper = document.getElementById('tasksWrapper');
    const dotsContainer = document.getElementById('stackDotsContainer');
    const swipeHint = document.getElementById('stackSwipeHint');
    const prevBtn = document.getElementById('stackPrevBtn');
    const nextBtn = document.getElementById('stackNextBtn');

    if (!wrapper) return;

    // Update buttons styling
    const modes = ['stack', 'grid', 'list'];
    modes.forEach(m => {
        const btn = document.getElementById(`btn-layout-${m}`);
        if (btn) {
            if (m === mode) {
                btn.className = 'layout-btn px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md';
            } else {
                btn.className = 'layout-btn px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all text-slate-400 hover:text-slate-200 hover:bg-slate-800';
            }
        }
    });

    // Toggle container classes
    wrapper.classList.remove('stack-view', 'grid-view', 'list-view');
    wrapper.classList.add(`${mode}-view`);

    if (mode === 'stack') {
        if (dotsContainer) dotsContainer.classList.remove('hidden');
        if (swipeHint) swipeHint.classList.remove('hidden');
        if (prevBtn) prevBtn.classList.remove('hidden');
        if (nextBtn) nextBtn.classList.remove('hidden');
        renderStackPositions();
    } else {
        if (dotsContainer) dotsContainer.classList.add('hidden');
        if (swipeHint) swipeHint.classList.add('hidden');
        if (prevBtn) prevBtn.classList.add('hidden');
        if (nextBtn) nextBtn.classList.add('hidden');
        resetCardTransforms();
    }
}

/**
 * Position cards in a stacked layer when in 'stack' mode
 */
function renderStackPositions() {
    if (currentLayout !== 'stack') return;

    const wrapper = document.getElementById('tasksWrapper');
    if (!wrapper) return;

    const cards = Array.from(wrapper.querySelectorAll('.morph-card:not(.hidden)'));
    const total = cards.length;
    if (total === 0) return;

    cards.forEach((card, i) => {
        // Calculate offset relative to activeStackIndex
        const offset = (i - activeStackIndex + total) % total;
        
        // Remove previous dragging listeners to avoid duplicates
        card.onpointerdown = null;
        card.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.35s ease';

        if (offset < 4) {
            // Visible stack elements
            const topOffset = offset * 14;
            const scale = 1 - offset * 0.04;
            const zIndex = 50 - offset;
            const rotate = offset === 0 ? 0 : (offset % 2 === 0 ? 2 : -2) * offset;
            const opacity = 1 - offset * 0.15;

            card.style.display = 'block';
            card.style.zIndex = zIndex;
            card.style.transform = `translate3d(0, ${topOffset}px, 0) scale(${scale}) rotate(${rotate}deg)`;
            card.style.opacity = opacity;

            if (offset === 0) {
                // Top card is fully interactive & draggable
                card.style.pointerEvents = 'auto';
                card.classList.add('cursor-grab');
                card.classList.remove('cursor-pointer');
                attachDragListeners(card, total);
            } else {
                card.style.pointerEvents = 'auto';
                card.classList.add('cursor-pointer');
                card.classList.remove('cursor-grab');
                card.onclick = () => setStackActiveIndex(i);
            }
        } else {
            // Excess cards
            card.style.display = 'none';
            card.style.opacity = '0';
            card.style.pointerEvents = 'none';
        }
    });

    updateStackDots();
}

/**
 * Attach pointer gesture listeners to the top card
 */
function attachDragListeners(card, totalCards) {
    card.onpointerdown = (e) => {
        if (e.target.closest('button') || e.target.closest('a') || e.target.closest('form')) {
            return; // Allow direct clicks on action buttons
        }

        isCardDragging = true;
        activeDragCard = card;
        startPointerX = e.clientX;
        startPointerY = e.clientY;
        currentDeltaX = 0;

        card.setPointerCapture(e.pointerId);
        card.style.transition = 'none'; // Instant responsive dragging
        card.classList.add('cursor-grabbing', 'ring-2', 'ring-violet-400');
    };

    card.onpointermove = (e) => {
        if (!isCardDragging || activeDragCard !== card) return;

        currentDeltaX = e.clientX - startPointerX;
        const deltaY = (e.clientY - startPointerY) * 0.2;
        const rotation = currentDeltaX * 0.07;

        card.style.transform = `translate3d(${currentDeltaX}px, ${deltaY}px, 0) rotate(${rotation}deg) scale(1.04)`;
    };

    const handleDragRelease = (e) => {
        if (!isCardDragging || activeDragCard !== card) return;
        isCardDragging = false;
        activeDragCard = null;

        card.classList.remove('cursor-grabbing', 'ring-2', 'ring-violet-400');
        try { card.releasePointerCapture(e.pointerId); } catch (_) {}

        const threshold = 70;

        if (currentDeltaX > threshold) {
            // Swiped Right - Throw card right and go to previous
            card.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
            card.style.transform = `translate3d(400px, 0, 0) rotate(20deg) scale(0.85)`;
            card.style.opacity = '0';

            setTimeout(() => {
                activeStackIndex = (activeStackIndex - 1 + totalCards) % totalCards;
                renderStackPositions();
            }, 200);

        } else if (currentDeltaX < -threshold) {
            // Swiped Left - Throw card left and go to next
            card.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
            card.style.transform = `translate3d(-400px, 0, 0) rotate(-20deg) scale(0.85)`;
            card.style.opacity = '0';

            setTimeout(() => {
                activeStackIndex = (activeStackIndex + 1) % totalCards;
                renderStackPositions();
            }, 200);

        } else {
            // Snap smoothly back to top position
            card.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.transform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
        }
    };

    card.onpointerup = handleDragRelease;
    card.onpointercancel = handleDragRelease;
}

/**
 * 1-Click Card Flippers
 */
function flipStackNext() {
    const cards = document.querySelectorAll('.morph-card:not(.hidden)');
    if (cards.length <= 1) return;
    activeStackIndex = (activeStackIndex + 1) % cards.length;
    renderStackPositions();
}

function flipStackPrev() {
    const cards = document.querySelectorAll('.morph-card:not(.hidden)');
    if (cards.length <= 1) return;
    activeStackIndex = (activeStackIndex - 1 + cards.length) % cards.length;
    renderStackPositions();
}

/**
 * Keyboard Navigation (Left & Right arrows flip stack)
 */
function initKeyboardNav() {
    window.addEventListener('keydown', (e) => {
        if (currentLayout !== 'stack') return;
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        if (e.key === 'ArrowRight') {
            flipStackNext();
        } else if (e.key === 'ArrowLeft') {
            flipStackPrev();
        }
    });
}

/**
 * Reset transforms for Grid and List modes
 */
function resetCardTransforms() {
    const wrapper = document.getElementById('tasksWrapper');
    if (!wrapper) return;

    const cards = wrapper.querySelectorAll('.morph-card');
    cards.forEach(card => {
        card.onpointerdown = null;
        card.onpointermove = null;
        card.onpointerup = null;
        card.onpointercancel = null;
        card.style.display = card.classList.contains('hidden') ? 'none' : 'block';
        card.style.transform = '';
        card.style.zIndex = '';
        card.style.opacity = '';
        card.style.pointerEvents = 'auto';
        card.classList.remove('cursor-grab', 'cursor-grabbing');
    });
}

/**
 * Set active card index in stack mode
 */
function setStackActiveIndex(index) {
    activeStackIndex = index;
    renderStackPositions();
}

/**
 * Update pagination dots
 */
function updateStackDots() {
    const dots = document.querySelectorAll('.stack-dot');
    dots.forEach((dot, index) => {
        if (index === activeStackIndex) {
            dot.className = 'stack-dot h-2.5 rounded-full transition-all duration-300 w-8 bg-gradient-to-r from-violet-500 to-emerald-400';
        } else {
            dot.className = 'stack-dot h-2.5 rounded-full transition-all duration-300 w-2.5 bg-slate-700 hover:bg-slate-500';
        }
    });
}

/**
 * Open Full Read More Modal
 */
function openTaskModal(event, index) {
    if (event) event.stopPropagation();

    const card = document.querySelector(`.morph-card[data-index="${index}"]`);
    if (!card) return;

    const title = card.dataset.title;
    const filename = card.dataset.filename;
    const words = card.dataset.words;
    const chars = card.dataset.chars;
    const date = card.dataset.date;
    const content = decodeURIComponent(card.dataset.content || '');

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalFilename').textContent = filename;
    document.getElementById('modalDate').textContent = date;
    document.getElementById('modalWords').textContent = `${words} words (${chars} chars)`;
    document.getElementById('modalContent').textContent = content || 'No description provided.';
    document.getElementById('modalDirectLink').href = `/task/${encodeURIComponent(filename)}`;

    const modal = document.getElementById('readMoreModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeTaskModal() {
    const modal = document.getElementById('readMoreModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function copyModalContent() {
    const text = document.getElementById('modalContent')?.innerText || '';
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        const textSpan = document.getElementById('modalCopyText');
        if (textSpan) {
            textSpan.textContent = 'Copied!';
            textSpan.classList.add('text-emerald-400');
            setTimeout(() => {
                textSpan.textContent = 'Copy Text';
                textSpan.classList.remove('text-emerald-400');
            }, 2000);
        }
    });
}

/**
 * Live Search Filter
 */
function initSearch() {
    const searchInput = document.getElementById('taskSearchInput');
    const noSearchState = document.getElementById('noSearchState');
    const wrapper = document.getElementById('tasksWrapper');

    if (searchInput && wrapper) {
        const cards = wrapper.querySelectorAll('.morph-card');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            let visibleCount = 0;

            cards.forEach(card => {
                const title = card.querySelector('.task-title')?.innerText.toLowerCase() || '';
                const snippet = card.querySelector('.task-snippet')?.innerText.toLowerCase() || '';

                if (title.includes(query) || snippet.includes(query)) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            if (noSearchState) {
                if (visibleCount === 0 && query.length > 0) {
                    noSearchState.classList.remove('hidden');
                } else {
                    noSearchState.classList.add('hidden');
                }
            }

            activeStackIndex = 0;
            if (currentLayout === 'stack') {
                renderStackPositions();
            }
        });
    }
}
