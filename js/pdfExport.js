/**
 * pdfExport.js
 * Módulo de exportação de PDF de alta fidelidade e suporte à impressão nativa.
 */

export class PDFExport {
  static async exportDirectPDF(state) {
    const element = document.querySelector(".fr-document-page");
    if (!element) {
      alert("Documento não encontrado para exportação.");
      return;
    }

    const codigoTurma = (state.codigoTurma || "SENAI").replace(/[^a-zA-Z0-9_-]/g, "_");
    const nomeCurso = (state.nomeCurso || "Cronograma").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Cronograma_${nomeCurso}_${codigoTurma}.pdf`;

    const btn = document.getElementById("btn-export-pdf");
    if (btn) {
      btn.classList.add("loading");
      btn.innerHTML = `<span class="spinner"></span> Gerando...`;
      btn.disabled = true;
    }

    // Salvar transform de zoom e filtro atuais para restaurar
    const originalTransform = element.style.transform;
    const originalFilter = element.style.filter;
    element.style.transform = "scale(1)";
    element.style.filter = "none";

    try {
      if (typeof window.html2pdf === "function") {
        const opt = {
          margin: 0,
          filename: filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2.2,
            useCORS: true,
            logging: false,
            scrollY: 0
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };

        await window.html2pdf().set(opt).from(element).save();
      } else {
        // Fallback nativo
        window.print();
      }
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      // Fallback para impressão se html2pdf falhar
      window.print();
    } finally {
      // Restaurar zoom e filtro
      element.style.transform = originalTransform;
      element.style.filter = originalFilter;
      if (btn) {
        btn.classList.remove("loading");
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Baixar PDF
        `;
        btn.disabled = false;
      }
    }
  }
}
