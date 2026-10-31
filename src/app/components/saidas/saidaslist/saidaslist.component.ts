import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { SaidasdetailsComponent } from '../saidasdetails/saidasdetails.component';
import { SaidasService, type Saida } from '../../../services/saidas.service';


@Component({
  selector: 'app-saidaslist',
  standalone: true,
  imports: [CommonModule, FormsModule, SaidasdetailsComponent],
  templateUrl: './saidaslist.component.html',
  styleUrl: './saidaslist.component.scss'
})
export class SaidaslistComponent implements OnInit {

  private readonly api = inject(SaidasService);

  saidas: Saida[] = [];
  carregando = false;
  erroCarregamento = '';

  ngOnInit(): void {
    this.carregarSaidas();
  }

  carregarSaidas(): void {
    this.carregando = true;
    this.erroCarregamento = '';

    this.api.findAll().subscribe({
      next: registros => {
        this.saidas = registros;
        this.carregando = false;
      },
      error: erro => {
        console.error('Erro ao carregar saidas:', erro);
        this.carregando = false;
        this.erroCarregamento = erro.status === 0
          ? 'Sem conexão com o Spring Boot. Confirme a porta e o CORS.'
          : 'Não foi possível carregar saidas do banco de dados.';
      }
    });
  }

  // =====================================
  // VARIÁVEIS DOS FILTROS
  // =====================================

  filtroNome: string = '';
  filtroMes: string = '';

  valorMinimo: number | null = null;
  valorMaximo: number | null = null;

  // =====================================
  // NORMALIZAÇÃO DO NOME
  // IGNORA ACENTOS E MAIÚSCULAS
  // =====================================

  private normalizarTexto(texto: string): string {

    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();

  }

  // =====================================
  // FILTRAR SAÍDAS
  // =====================================

  get saidasFiltradas(): Saida[] {

    const nomePesquisado = this.normalizarTexto(
      this.filtroNome
    );

    return this.saidas

      .filter((saida) => {

        // NORMALIZA O NOME REGISTRADO
        const nomeNormalizado = this.normalizarTexto(
          saida.nomeSaida
        );

        // FILTRO POR NOME
        const atendeNome =
          !nomePesquisado ||
          nomeNormalizado.includes(nomePesquisado);

        // FILTRO POR MÊS
        const atendeMes =
          !this.filtroMes ||
          saida.dataHora.startsWith(this.filtroMes);

        // VALOR ESTRITAMENTE MAIOR
        const atendeMinimo =
          this.valorMinimo == null ||
          saida.valor > this.valorMinimo;

        // VALOR ESTRITAMENTE MENOR
        const atendeMaximo =
          this.valorMaximo == null ||
          saida.valor < this.valorMaximo;

        return (
          atendeNome &&
          atendeMes &&
          atendeMinimo &&
          atendeMaximo
        );

      })

      // MAIS RECENTES PRIMEIRO
      .sort((a, b) =>
        b.dataHora.localeCompare(a.dataHora)
      );

  }

  // =====================================
  // FORMATAÇÃO DE MOEDA
  // =====================================

  private readonly formatadorMoeda =
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

  formatarMoeda(valor: number): string {

    return this.formatadorMoeda.format(valor);

  }

  // =====================================
  // FORMATAÇÃO DE DATA E HORA
  // =====================================

  formatarData(dataHora: string): string {

    const [data, hora] = dataHora.split('T');
    const [ano, mes, dia] = data.split('-');

    return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;

  }

  // =====================================
  // TOTAL DAS SAÍDAS FILTRADAS
  // =====================================

  get totalFiltrado(): number {

    return this.saidasFiltradas.reduce(
      (total, saida) => total + saida.valor,
      0
    );

  }

  // =====================================
  // LIMPAR FILTROS
  // =====================================

  limparFiltros(): void {

    this.filtroNome = '';
    this.filtroMes = '';

    this.valorMinimo = null;
    this.valorMaximo = null;

  }

  // =====================================
  // EXCLUIR SAIDA NO BACKEND
  // =====================================
  async excluirSaida(id: number): Promise<void> {
    const item = this.saidas.find(registro => registro.id === id);
    if (!item) return;

    const resultado = await Swal.fire({
      titleText: 'Confirmar exclusão',
      icon: 'warning',
      iconHtml: `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/><path d="M8 6V4h8v2"/>
          <path d="M5 6l1 15h12l1-15"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
        </svg>`,
      text: `Tem certeza que deseja excluir "${item.nomeSaida}"?\n` +
        'Esta ação não poderá ser desfeita.',
      showCloseButton: true,
      showCancelButton: true,
      confirmButtonText: 'Excluir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: false,
      background: '#4b4b57',
      color: '#ffffff',
      customClass: {
        popup: 'bs-delete-popup',
        title: 'bs-delete-title',
        icon: 'bs-delete-icon',
        htmlContainer: 'bs-delete-message',
        actions: 'bs-delete-actions',
        confirmButton: 'bs-delete-confirm',
        cancelButton: 'bs-delete-cancel',
        closeButton: 'bs-delete-close'
      }
    });

    if (!resultado.isConfirmed) return;

    this.api.deleteById(id).subscribe({
      next: () => {
        this.carregarSaidas();
        void Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          titleText: 'Saida excluída com sucesso!',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          background: '#ffffff',
          color: '#302c70'
        });
      },
      error: erro => {
        console.error('Erro ao excluir saida:', erro);
        void Swal.fire({
          titleText: 'Erro ao excluir',
          text: erro.status === 0
            ? 'Não foi possível conectar ao Spring Boot.'
            : 'Não foi possível excluir esta saída no banco de dados.',
          icon: 'error',
          confirmButtonColor: '#6355d9'
        });
      }
    });
  }

  // =====================================
  // IDENTIFICA CADA SAÍDA PELO ID
  // =====================================

  identificarSaida(
    index: number,
    saida: Saida
  ): number {

    return saida.id;

  }


// =====================================
// MENU DE AÇÕES E MODAL DE EDIÇÃO
// =====================================
menuAbertoId: number | null = null;
menuTop = 0;
menuLeft = 0;
saidaEmEdicao: Saida | null = null;
criandoSaida = false;

get saidaMenuSelecionada(): Saida | null {
  return this.saidas.find(item => item.id === this.menuAbertoId) ?? null;
}

alternarMenu(id: number, evento: MouseEvent): void {
  evento.stopPropagation();

  if (this.menuAbertoId === id) {
    this.fecharMenu();
    return;
  }

  const botao = evento.currentTarget as HTMLElement;
  const posicao = botao.getBoundingClientRect();
  const largura = 180;
  const altura = 102;
  const margem = 12;

  this.menuLeft = Math.max(margem, Math.min(
    posicao.right - largura,
    window.innerWidth - largura - margem
  ));

  this.menuTop = posicao.bottom + altura + margem > window.innerHeight
    ? Math.max(margem, posicao.top - altura - 6)
    : posicao.bottom + 6;

  this.menuAbertoId = id;
}

fecharMenu(): void {
  this.menuAbertoId = null;
}

@HostListener('document:click')
fecharMenuAoClicarFora(): void {
  this.fecharMenu();
}

@HostListener('window:resize')
fecharMenuAoRedimensionar(): void {
  this.fecharMenu();
}

@HostListener('document:keydown.escape')
fecharComEscape(): void {
  this.fecharMenu();
  this.fecharEdicao();
}

// Novo registro: utiliza o details com campos vazios.
abrirCadastro(): void {
  this.fecharMenu();
  this.saidaEmEdicao = null;
  this.criandoSaida = true;
}

// Editar: utiliza o details preenchido com o registro selecionado.
abrirEdicao(): void {
  const selecionada = this.saidaMenuSelecionada;
  this.fecharMenu();

  if (!selecionada) return;

  this.criandoSaida = false;
  // Cópia para preservar os dados até o usuário clicar em Salvar.
  this.saidaEmEdicao = { ...selecionada };
}

fecharEdicao(): void {
  this.saidaEmEdicao = null;
  this.criandoSaida = false;
}

// Executado depois que o backend confirmou o salvamento.
aoSalvarEdicao(): void {
  const eraCadastro = this.criandoSaida;
  this.fecharEdicao();
  this.carregarSaidas();
  void Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    titleText: eraCadastro
      ? 'Saida cadastrada com sucesso!'
      : 'Saida atualizada com sucesso!',
    showConfirmButton: false,
    timer: 1800,
    timerProgressBar: true,
    background: '#ffffff',
    color: '#302c70'
  });
}

// Usa o SweetAlert2 já existente no método excluirSaida().
excluirSelecionada(): void {
  const id = this.menuAbertoId;
  this.fecharMenu();
  if (id !== null) void this.excluirSaida(id);
}

}
