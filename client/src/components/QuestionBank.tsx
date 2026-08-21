import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Question, QuestionKind, QuestionsState } from "../types";

interface QuestionBankProps {
  questions: QuestionsState;
  onAdd: (input: {
    kind: QuestionKind;
    label?: string;
    prompt?: string;
    options?: string[];
    correctOptionIndex?: number;
    imageUrl?: string;
  }) => void;
  onRemove: (questionId: string) => void;
  onShow: (questionId: string) => void;
  onHide: () => void;
  onReveal: () => void;
}

const KIND_LABELS: Record<QuestionKind, string> = {
  texto: "Texto",
  "multipla-escolha": "Múltipla escolha",
  "verdadeiro-falso": "Verdadeiro ou falso",
  imagem: "Imagem",
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/questions/upload", { method: "POST", body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Falha no upload.");
  return data.url as string;
}

export function QuestionBank({ questions, onAdd, onRemove, onShow, onHide, onReveal }: QuestionBankProps) {
  const [kind, setKind] = useState<QuestionKind>("texto");
  const [label, setLabel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleKindChange = (newKind: QuestionKind) => {
    setKind(newKind);
    setImageUrl(null);
    setUploadError("");
    setOptions(["", ""]);
    setCorrectIndex(null);
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setImageUrl(null);
    try {
      setImageUrl(await uploadImage(file));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const handleAddOption = () => setOptions((prev) => [...prev, ""]);

  const handleRemoveOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
    setCorrectIndex((prev) => {
      if (prev === null || prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (kind === "imagem" && !imageUrl) return;
    if (kind !== "imagem" && !prompt.trim()) return;

    // Remapeia o índice da alternativa correta pra depois de descartar as
    // vazias — senão, se sobrar um espaço em branco no meio da lista, o
    // índice marcado aponta pra alternativa errada no payload final.
    const cleanOptions: string[] = [];
    let cleanCorrectIndex: number | null = null;
    options.forEach((raw, i) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      if (i === correctIndex) cleanCorrectIndex = cleanOptions.length;
      cleanOptions.push(trimmed);
    });
    if (kind === "multipla-escolha" && (cleanOptions.length < 2 || cleanCorrectIndex === null)) return;
    if (kind === "verdadeiro-falso" && correctIndex === null) return;

    onAdd({
      kind,
      label: label.trim() || undefined,
      prompt: prompt.trim(),
      options: kind === "multipla-escolha" ? cleanOptions : undefined,
      correctOptionIndex:
        kind === "multipla-escolha"
          ? cleanCorrectIndex ?? undefined
          : kind === "verdadeiro-falso"
            ? correctIndex ?? undefined
            : undefined,
      imageUrl: kind === "imagem" ? imageUrl ?? undefined : undefined,
    });

    setLabel("");
    setPrompt("");
    setOptions(["", ""]);
    setCorrectIndex(null);
    setImageUrl(null);
    setUploadError("");
  };

  const handleRemove = (question: Question) => {
    const title = question.prompt || question.label || "esta pergunta";
    if (window.confirm(`Remover "${title}"?`)) {
      onRemove(question.id);
    }
  };

  return (
    <div className="question-bank">
      <form className="question-bank__form" onSubmit={handleSubmit}>
        <div className="question-bank__form-row">
          <select value={kind} onChange={(e) => handleKindChange(e.target.value as QuestionKind)}>
            <option value="texto">Texto simples</option>
            <option value="multipla-escolha">Múltipla escolha</option>
            <option value="verdadeiro-falso">Verdadeiro ou falso</option>
            <option value="imagem">Imagem</option>
          </select>
          <input
            type="text"
            placeholder="Rótulo (opcional): Prova Relâmpago, Uma Música..."
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        {kind === "imagem" && (
          <div className="question-bank__image-field">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleImageChange} />
            {uploading && <p className="question-bank__upload-status">Enviando imagem...</p>}
            {uploadError && <p className="question-bank__upload-error">{uploadError}</p>}
            {imageUrl && <img className="question-bank__preview" src={imageUrl} alt="" />}
          </div>
        )}

        <textarea
          className="question-bank__prompt-input"
          placeholder={kind === "imagem" ? "Legenda / instrução (opcional)" : "Enunciado da pergunta"}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {kind === "multipla-escolha" && (
          <div className="question-bank__options">
            {options.map((option, index) => (
              <div key={index} className="question-bank__option-row">
                <label
                  className="question-bank__correct-radio"
                  title="Marcar como alternativa correta"
                >
                  <input
                    type="radio"
                    name="correct-option"
                    checked={correctIndex === index}
                    onChange={() => setCorrectIndex(index)}
                    aria-label={`Marcar alternativa ${OPTION_LETTERS[index] ?? index + 1} como correta`}
                  />
                </label>
                <input
                  type="text"
                  placeholder={`Alternativa ${OPTION_LETTERS[index] ?? index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  disabled={options.length <= 2}
                  aria-label="Remover alternativa"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="question-bank__add-option" onClick={handleAddOption}>
              + Adicionar alternativa
            </button>
            <p className="question-bank__correct-hint">
              Marque com o círculo qual alternativa é a correta — ela fica pronta pra revelar no
              Telão.
            </p>
          </div>
        )}

        {kind === "verdadeiro-falso" && (
          <div className="question-bank__vf-picker">
            {(["Verdadeiro", "Falso"] as const).map((label, index) => (
              <label
                key={label}
                className={`question-bank__vf-option${correctIndex === index ? " question-bank__vf-option--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="vf-correct"
                  checked={correctIndex === index}
                  onChange={() => setCorrectIndex(index)}
                />
                {label} é a correta
              </label>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={
            uploading ||
            (kind === "imagem" && !imageUrl) ||
            ((kind === "multipla-escolha" || kind === "verdadeiro-falso") && correctIndex === null)
          }
        >
          Adicionar pergunta
        </button>
      </form>

      <ul className="question-bank__list">
        {questions.items.length === 0 && (
          <li className="question-bank__empty">Nenhuma pergunta cadastrada ainda.</li>
        )}
        {questions.items.map((question) => {
          const isActive = question.id === questions.activeQuestionId;
          return (
            <li
              key={question.id}
              className={`question-bank__item${isActive ? " question-bank__item--active" : ""}`}
            >
              <div className="question-bank__item-header">
                <span className="question-bank__kind-badge">{KIND_LABELS[question.kind]}</span>
                {question.label && <span className="question-bank__label-chip">{question.label}</span>}
                <button
                  type="button"
                  className="question-bank__remove"
                  onClick={() => handleRemove(question)}
                  aria-label="Remover pergunta"
                >
                  ×
                </button>
              </div>

              {question.kind === "imagem" && question.imageUrl && (
                <img className="question-bank__thumb" src={question.imageUrl} alt="" />
              )}

              {question.prompt && <p className="question-bank__prompt">{question.prompt}</p>}

              {question.kind === "multipla-escolha" && (
                <ul className="question-bank__options-preview">
                  {question.options.map((option, index) => (
                    <li
                      key={index}
                      className={
                        index === question.correctOptionIndex
                          ? "question-bank__options-preview-correct"
                          : undefined
                      }
                    >
                      {index === question.correctOptionIndex ? "✓ " : ""}
                      {option}
                    </li>
                  ))}
                </ul>
              )}

              {question.kind === "verdadeiro-falso" && question.correctOptionIndex !== null && (
                <p className="question-bank__vf-answer">
                  Resposta correta:{" "}
                  <strong>{question.correctOptionIndex === 0 ? "Verdadeiro" : "Falso"}</strong>
                </p>
              )}

              <div className="question-bank__item-actions">
                <button
                  type="button"
                  className={`question-bank__toggle${isActive ? " question-bank__toggle--active" : ""}`}
                  onClick={() => (isActive ? onHide() : onShow(question.id))}
                >
                  {isActive ? "Ocultar do Telão" : "Mostrar no Telão"}
                </button>

                {isActive &&
                  (question.kind === "multipla-escolha" || question.kind === "verdadeiro-falso") &&
                  question.correctOptionIndex !== null && (
                    <button
                      type="button"
                      className="question-bank__reveal"
                      onClick={onReveal}
                      disabled={questions.revealed}
                    >
                      {questions.revealed ? "Resposta revelada" : "Revelar resposta"}
                    </button>
                  )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
