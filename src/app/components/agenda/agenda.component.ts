import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, HostListener, Input, OnInit, inject } from '@angular/core';
import Swal from 'sweetalert2';

import { AuthService } from '../../services/auth.service';
import {
  AgendaFinanceiraService,
  type AgendaFinanceira,
  type AgendaCadastro,
  type AgendaEdicao,
  type MoedaAgenda,
  type StatusAgenda,
  type TipoAgenda
} from '../../services/agenda-financeira.service';

type FiltroStatus = 'TODOS' | StatusAgenda;
type TipoResumo = 'PENDENTE' | 'PROXIMOS' | 'CONFIRMADO';

type Formulario = {
  nome: string;
  valor: number | null;
  moeda: MoedaAgenda;
  dataHora: string;
};

type Alerta = {
  texto: string;
  classe: string;
};

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss'
})
export class AgendaComponent implements OnInit {
  // O componente Pagar passa PAGAR; o Receber passa RECEBER.
  @Input({ required: true }) tipo!: TipoAgenda;

  private readonly api = inject(AgendaFinanceiraService);
  private readonly auth = inject(AuthService);

  readonly moedas: MoedaAgenda[] = ['BRL', 'PYG', 'USD'];
  contas: AgendaFinanceira[] = [];
  carregando = false;
  salvando = false;
  erroCarregamento = '';
  erroOperacao = '';
  acaoId: number | null = null;

  filtroNome = '';
  filtroStatus: FiltroStatus = 'TODOS';

  cadastro: Formulario = this.formularioVazio();
  edicao: Formulario = this.formularioVazio();
  contaEmEdicao: AgendaFinanceira | null = null;

  menuAbertoId: number | null = null;
  menuTop = 0;
  menuLeft = 0;

  ngOnInit(): void {
    this.carregar();
  }

  get podeModificar(): boolean {
    return this.auth.isAdmin();
  }

  get titulo(): string {
    return this.tipo === 'PAGAR' ? 'A pagar' : 'A receber';
  }

  get subtitulo(): string {
    return this.tipo === 'PAGAR'
      ? 'Agenda de contas e pagamentos previstos.'
      : 'Agenda de valores e recebimentos previstos.';
  }

  get tituloCadastro(): string {
    return this.tipo === 'PAGAR'
      ? 'Cadastrar conta a pagar'
      : 'Cadastrar conta a receber';
  }

  get tituloTabela(): string {
    return this.tipo === 'PAGAR'
      ? 'Agenda de pagamentos'
      : 'Agenda de recebimentos';
  }

  get contasFiltradas(): AgendaFinanceira[] {
    const busca = this.normalizar(this.filtroNome);
    return this.contas.filter(conta => {
      const nomeOk = !busca || this.normalizar(conta.nome).includes(busca);
      const statusOk = this.filtroStatus === 'TODOS' ||
        (this.filtroStatus === 'PENDENTE' && conta.status === 'PENDENTE') ||
        (this.filtroStatus === 'CONFIRMADO' && this.confirmadaNosUltimos30Dias(conta));
      return nomeOk && statusOk;
    });
  }

  get contaMenuSelecionada(): AgendaFinanceira | null {
    return this.contas.find(c => c.id === this.menuAbertoId) ?? null;
  }

  carregar(): void {
    this.fecharMenu();
    this.carregando = true;
    this.erroCarregamento = '';
    this.api.listar(this.tipo).subscribe({
      next: contas => {
        this.contas = [...contas].sort((a, b) => a.dataHora.localeCompare(b.dataHora));
        this.carregando = false;
      },
      error: erro => {
        console.error('Erro ao listar agenda:', erro);
        this.carregando = false;
        this.erroCarregamento = this.mensagemErro(erro);
      }
    });
  }

  // Cada card soma somente a moeda escolhida, SEM cambio e SEM mexer no Extrato.
  total(tipo: TipoResumo, moeda: MoedaAgenda): number {
    // Comparar dias completos: uma conta que vence hoje nao fica atrasada
    // so porque a meia-noite ja passou.
    const hoje = this.inicioDoDia(new Date());
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 7);

    return this.contas.reduce((soma, conta) => {
      if (conta.moeda !== moeda) return soma;
      const vencimento = this.lerDataLocal(conta.dataHora);
      const considera = tipo === 'PENDENTE'
        ? conta.status === 'PENDENTE'
        : tipo === 'CONFIRMADO'
          ? this.confirmadaNosUltimos30Dias(conta)
          : conta.status === 'PENDENTE' && vencimento >= hoje && vencimento <= limite;
      return soma + (considera ? Number(conta.valor) : 0);
    }, 0);
  }

  // Os ultimos 30 dias sao calculados pela DATA DA CONFIRMACAO,
  // nao pela data de vencimento. Inclui hoje e os 29 dias anteriores.
  // Confirmados legados sem dataConfirmacao nao entram neste resumo.
  private confirmadaNosUltimos30Dias(conta: AgendaFinanceira): boolean {
    if (conta.status !== 'CONFIRMADO' || !conta.dataConfirmacao) {
      return false;
    }
    const dataConfirmacao = new Date(conta.dataConfirmacao);
    if (Number.isNaN(dataConfirmacao.getTime())) return false;

    const hoje = this.inicioDoDia(new Date());
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 29);
    const fim = new Date(hoje);
    fim.setDate(fim.getDate() + 1);

    return dataConfirmacao >= inicio && dataConfirmacao < fim;
  }

  alerta(conta: AgendaFinanceira): Alerta {
    if (conta.status === 'CONFIRMADO') {
      return { texto: 'Confirmado', classe: 'confirmado' };
    }
    const hoje = this.inicioDoDia(new Date());
    const vencimento = this.lerDataLocal(conta.dataHora);
    if (vencimento < hoje) {
      return { texto: 'Atrasado', classe: 'atrasado' };
    }
    if (vencimento.getTime() === hoje.getTime()) {
      return { texto: 'Hoje', classe: 'hoje' };
    }
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    if (vencimento.getTime() === amanha.getTime()) {
      return { texto: 'Amanhã', classe: 'amanha' };
    }
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 7);
    if (vencimento <= limite) {
      return { texto: 'Próximo', classe: 'proximo' };
    }
    return { texto: 'Programado', classe: 'programado' };
  }

  formatarMoeda(valor: number, moeda: MoedaAgenda): string {
    if (moeda === 'PYG') {
      return '₲ ' + new Intl.NumberFormat('es-PY', {
        maximumFractionDigits: 0
      }).format(valor);
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency: moeda,
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(valor);
  }

  formatarData(dataHora: string): string {
    // Mostrar somente a data, inclusive para cadastros antigos.
    const [ano, mes, dia] = dataHora.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  salvarCadastro(): void {
    if (!this.podeModificar || this.salvando || !this.formularioValido(this.cadastro)) return;
    this.salvando = true;
    this.erroOperacao = '';
    const dados: AgendaCadastro = {
      nome: this.cadastro.nome.trim(),
      valor: Number(this.cadastro.valor),
      moeda: this.cadastro.moeda,
      dataHora: this.normalizarDataHora(this.cadastro.dataHora),
      tipo: this.tipo
    };
    this.api.cadastrar(dados).subscribe({
      next: () => {
        this.salvando = false;
        this.cadastro = this.formularioVazio();
        this.carregar();
        this.toast('Conta cadastrada como pendente!');
      },
      error: erro => {
        this.salvando = false;
        this.erroOperacao = this.mensagemErro(erro);
      }
    });
  }

  abrirEdicao(): void {
    const conta = this.contaMenuSelecionada;
    this.fecharMenu();
    if (!conta || !this.podeModificar) return;
    this.contaEmEdicao = conta;
    this.edicao = {
      nome: conta.nome,
      valor: Number(conta.valor),
      moeda: conta.moeda,
      dataHora: conta.dataHora.slice(0, 10)
    };
    this.erroOperacao = '';
  }

  fecharEdicao(): void {
    if (this.salvando) return;
    this.contaEmEdicao = null;
    this.erroOperacao = '';
  }

  salvarEdicao(): void {
    if (!this.podeModificar || this.salvando || !this.contaEmEdicao || !this.formularioValido(this.edicao)) return;
    this.salvando = true;
    this.erroOperacao = '';
    const dados: AgendaEdicao = {
      nome: this.edicao.nome.trim(),
      valor: Number(this.edicao.valor),
      moeda: this.edicao.moeda,
      dataHora: this.normalizarDataHora(this.edicao.dataHora)
    };
    this.api.editar(this.contaEmEdicao.id, dados).subscribe({
      next: () => {
        this.salvando = false;
        this.contaEmEdicao = null;
        this.carregar();
        this.toast('Conta atualizada com sucesso!');
      },
      error: erro => {
        this.salvando = false;
        this.erroOperacao = this.mensagemErro(erro);
      }
    });
  }

  confirmar(conta: AgendaFinanceira): void {
    if (!this.podeModificar || conta.status !== 'PENDENTE' || this.acaoId !== null) return;
    this.fecharMenu();
    this.acaoId = conta.id;
    this.erroOperacao = '';
    this.api.confirmar(conta.id).subscribe({
      next: () => {
        this.acaoId = null;
        this.carregar();
        this.toast('Conta confirmada com sucesso!');
      },
      error: erro => {
        this.acaoId = null;
        this.erroOperacao = this.mensagemErro(erro);
        void Swal.fire({ titleText: 'Erro ao confirmar', text: this.erroOperacao, icon: 'error', confirmButtonColor: '#6355d9' });
      }
    });
  }

  async excluirSelecionada(): Promise<void> {
    const conta = this.contaMenuSelecionada;
    this.fecharMenu();
    if (!conta || !this.podeModificar || this.acaoId !== null) return;

    const resultado = await Swal.fire({
      titleText: 'Confirmar exclusão',
      text: `Tem certeza que deseja excluir "${conta.nome}"? Esta ação não poderá ser desfeita.`,
      icon: 'warning',
      showCancelButton: true,
      showCloseButton: true,
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

    this.acaoId = conta.id;
    this.api.excluir(conta.id).subscribe({
      next: () => {
        this.acaoId = null;
        this.carregar();
        this.toast('Conta excluída com sucesso!');
      },
      error: erro => {
        this.acaoId = null;
        void Swal.fire({ titleText: 'Erro ao excluir', text: this.mensagemErro(erro), icon: 'error', confirmButtonColor: '#6355d9' });
      }
    });
  }

  alternarMenu(id: number, evento: MouseEvent): void {
    evento.stopPropagation();
    if (!this.podeModificar) return;
    if (this.menuAbertoId === id) {
      this.fecharMenu();
      return;
    }
    const botao = evento.currentTarget as HTMLElement;
    const pos = botao.getBoundingClientRect();
    const largura = 180;
    const altura = 102;
    const margem = 12;
    this.menuLeft = Math.max(margem, Math.min(pos.right - largura, window.innerWidth - largura - margem));
    this.menuTop = pos.bottom + altura + margem > window.innerHeight
      ? Math.max(margem, pos.top - altura - 6)
      : pos.bottom + 6;
    this.menuAbertoId = id;
  }

  fecharMenu(): void {
    this.menuAbertoId = null;
  }

  identificarConta(_index: number, conta: AgendaFinanceira): number {
    return conta.id;
  }

  @HostListener('document:click')
  aoClicarFora(): void { this.fecharMenu(); }

  @HostListener('window:resize')
  aoRedimensionar(): void { this.fecharMenu(); }

  @HostListener('document:keydown.escape')
  aoEscape(): void {
    this.fecharMenu();
    this.fecharEdicao();
  }

  private formularioVazio(): Formulario {
    return { nome: '', valor: null, moeda: 'BRL', dataHora: '' };
  }

  private formularioValido(form: Formulario): boolean {
    return !!form.nome.trim() && form.nome.trim().length <= 150 &&
      form.valor !== null && Number.isFinite(Number(form.valor)) &&
      Number(form.valor) > 0 && Number(form.valor) <= 1e30 &&
      (form.moeda === 'PYG'
        ? Number.isInteger(Number(form.valor))
        : Math.abs(Number(form.valor) * 100 - Math.round(Number(form.valor) * 100)) < 0.0000001) &&
      !!form.dataHora;
  }

  private normalizarDataHora(valor: string): string {
    // O backend ainda usa LocalDateTime. Enviamos meia-noite automaticamente,
    // sem exibir ou pedir hora ao usuario.
    return `${valor.slice(0, 10)}T00:00:00`;
  }

  private lerDataLocal(dataHora: string): Date {
    // Interpretacao como data local, sem deslocamento de fuso horario.
    const [ano, mes, dia] = dataHora.slice(0, 10).split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  private inicioDoDia(data: Date): Date {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }

  private mensagemErro(erro: { status?: number }): string {
    if (erro.status === 0) return 'Sem conexão com o Spring Boot (porta 8080).';
    if (erro.status === 401) return 'Sessão expirada. Faça login novamente.';
    if (erro.status === 403) return 'Seu usuário não tem permissão para essa ação.';
    if (erro.status === 409) return 'Essa conta já foi confirmada.';
    if (erro.status === 400) return 'Confira os campos obrigatórios, valor, moeda e data.';
    return 'Não foi possível concluir a operação. Tente novamente.';
  }

  private toast(mensagem: string): void {
    void Swal.fire({
      toast: true, position: 'top-end', icon: 'success',
      titleText: mensagem, showConfirmButton: false,
      timer: 1900, timerProgressBar: true,
      background: '#ffffff', color: '#302c70'
    });
  }
}
