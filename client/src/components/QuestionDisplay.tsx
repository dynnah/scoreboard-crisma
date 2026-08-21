import type { Question } from "../types";

interface QuestionDisplayProps {
  question: Question;
  revealed: boolean;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuestionDisplay({ question, revealed }: QuestionDisplayProps) {
  return (
    <div className="question-display">
      {question.label && <div className="question-display__label">{question.label}</div>}

      {question.kind === "imagem" && question.imageUrl && (
        <img className="question-display__image" src={question.imageUrl} alt="" />
      )}

      {question.prompt && <div className="question-display__prompt">{question.prompt}</div>}

      {question.kind === "multipla-escolha" && (
        <ol className="question-display__options">
          {question.options.map((option, index) => {
            const isCorrect = revealed && index === question.correctOptionIndex;
            return (
              <li
                key={index}
                className={`question-display__option${isCorrect ? " question-display__option--correct" : ""}`}
              >
                <span className="question-display__option-letter">
                  {OPTION_LETTERS[index] ?? index + 1}
                </span>
                <span>{option}</span>
                {isCorrect && <span className="question-display__option-check">✓</span>}
              </li>
            );
          })}
        </ol>
      )}

      {question.kind === "verdadeiro-falso" && (
        <div className="question-display__true-false">
          {["Verdadeiro", "Falso"].map((label, index) => {
            const isCorrect = revealed && index === question.correctOptionIndex;
            return (
              <span
                key={label}
                className={`question-display__tf-option${isCorrect ? " question-display__tf-option--correct" : ""}`}
              >
                {label}
                {isCorrect && <span className="question-display__option-check">✓</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
