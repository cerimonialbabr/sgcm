function renderGuia(){
  const o=operacaoAtual();
  $('#main').innerHTML=`<div class="section-title">GUIA RÁPIDO</div>
  <div class="card guide-card">
    <p>O <b>SGCM</b> apoia o planejamento e a execução de cerimônias militares, mantendo banco de autoridades, convidados, familiares, precedência, Tribuna, Nominata, estatísticas e documentos.</p>
    <div class="guide-tech small muted"><b>Conexão:</b> ${esc(transportLabel())} · <b>Snapshot:</b> ${esc(o.atualizadoEm||'ainda não sincronizado')}</div>
  </div>`;
}
