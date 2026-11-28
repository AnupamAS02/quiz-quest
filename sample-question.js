const sampleQuestion = questionBank.find((question) => question.id === "engineer-role");
const sampleAnswers = document.querySelectorAll(".sample-answer");
const sampleFeedback = document.getElementById("sample-feedback");
const sampleStartButton = document.getElementById("sample-start-btn");

sampleAnswers.forEach((button) => {
    button.addEventListener("click", (event) => {
        if (button.disabled || !sampleQuestion) return;

        const selectedIndex = Number(event.currentTarget.dataset.index);
        const isCorrect = selectedIndex === sampleQuestion.correctIndex;
        sampleAnswers.forEach((answer, index) => {
            answer.disabled = true;
            if (index === sampleQuestion.correctIndex) {
                answer.classList.add("correct");
                answer.textContent += " — Correct answer";
            } else if (index === selectedIndex) {
                answer.classList.add("wrong");
                answer.textContent += " — Your answer";
            }
        });

        sampleFeedback.textContent = isCorrect
            ? `Correct! ${sampleQuestion.explanation}`
            : `Not quite. The correct answer is ${sampleQuestion.choices[sampleQuestion.correctIndex]}. ${sampleQuestion.explanation}`;
        sampleFeedback.classList.add(isCorrect ? "is-correct" : "is-incorrect");
        sampleFeedback.hidden = false;
        sampleStartButton.hidden = false;
        sampleFeedback.focus();
    });
});
