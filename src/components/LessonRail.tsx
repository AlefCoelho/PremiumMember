"use client";

import { CheckCircle2, Circle, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LessonPresentation, MemberModule } from "@/lib/lessons";

/**
 * O trilho do curso ao lado da aula.
 *
 * No computador fica aberto; no celular comeca fechado, senao a lista inteira
 * do curso empurra a aula para fora da primeira tela. Comeca `true` para o HTML
 * do servidor bater com o do cliente, e o efeito ajusta depois — mesmo padrao
 * da lateral da comunidade.
 */
export function LessonRail({
  modules,
  currentLessonId,
  completed,
  total,
  presentation,
}: {
  modules: MemberModule[];
  currentLessonId: number;
  completed: number;
  total: number;
  presentation: Record<number, LessonPresentation>;
}) {
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 980px)");
    const aplicar = () => setAberto(!consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  const percent = total ? Math.round((completed / total) * 100) : 0;

  return (
    <details className="lesson-rail" open={aberto}>
      <summary>
        <span>
          {completed} de {total} concluidas
        </span>
        <em>{percent}%</em>
      </summary>

      <div className="course-bar">
        <span style={{ width: `${percent}%` }} />
      </div>

      <div className="lesson-rail-body">
        {modules.map((modulo) => (
          <section key={modulo.id}>
            <h3>{modulo.title}</h3>
            <ul>
              {modulo.lessons.map((aula) => {
                const meta = presentation[aula.id];

                if (!aula.unlocked) {
                  return (
                    <li className="locked" key={aula.id}>
                      <Lock size={14} />
                      <span>{aula.title}</span>
                    </li>
                  );
                }

                return (
                  <li className={aula.id === currentLessonId ? "atual" : undefined} key={aula.id}>
                    {aula.completed ? (
                      <CheckCircle2 size={14} className="course-lesson-done" />
                    ) : (
                      <Circle size={14} />
                    )}
                    {meta?.thumb_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/uploads/${meta.thumb_path}`} alt="" />
                    ) : null}
                    <Link href={`/socio/aula/${aula.slug}`}>{aula.title}</Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
