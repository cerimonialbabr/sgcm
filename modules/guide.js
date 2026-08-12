function renderGuia(){
  const o=operacaoAtual();
  $('#main').innerHTML=`<div class="section-title">GUIA RÁPIDO</div>
  <div class="card guide-card">
    <p>O <b>SGCM</b> apoia o planejamento e a execução de cerimônias militares, mantendo banco de autoridades, convidados, familiares, precedência, Tribuna, Nominata, estatísticas e documentos.</p>
    <h3>OPERADOR</h3>
    <p>Durante a cerimônia, use <b>Recepção</b> para localizar e confirmar chegadas, <b>Presentes</b> para acompanhar quem já chegou e <b>Familiares</b> para controlar acompanhantes. Essas telas usam o snapshot local da cerimônia ativa para responder rapidamente.</p>
    <h3>GERENCIAL / CERIMONIAL</h3>
    <p>Crie a cerimônia, importe convidados nas abas da planilha e mantenha o banco em <b>Autoridades</b>. Use <b>Evento</b>, <b>Tribuna</b>, <b>Nominata</b>, <b>Estatísticas</b> e <b>Gerar arquivos</b> para preparar e conduzir o cerimonial. Apenas uma cerimônia fica ATIVA por vez.</p>
    <h3>REFERÊNCIAS</h3>
    <p>As regras incorporadas consideram a <b>ICA 908-1</b>, a <b>ICA 908-2</b>, o <b>Decreto de Precedência</b> e as demais normas adotadas para cerimonial e locução.</p>
    <div class="guide-tech small muted"><b>Conexão:</b> ${esc(transportLabel())} · <b>Snapshot:</b> ${esc(o.atualizadoEm||'ainda não sincronizado')}</div>
  </div>`;
}
