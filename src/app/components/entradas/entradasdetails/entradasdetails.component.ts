import { Component, OnInit, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { EntradasService, type Entrada } from '../../../services/entradas.service';

// Permite compartilhar o tipo entre a listagem e o formulário.
export type { Entrada } from '../../../services/entradas.service';

@Component({
  selector: 'app-entradasdetails',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './entradasdetails.component.html',
  styleUrl: './entradasdetails.component.scss'
})
export class EntradasdetailsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(EntradasService);

  @Input() emModal = false;
  @Input() entradaParaEditar: Entrada | null = null;
  @Output() salvo = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  nomeEntrada = '';
  valor: number | null = null;
  modoEdicao = false;
  idEntrada: number | null = null;
  mensagemErro = '';
  salvando = false;

  ngOnInit(): void {
    if (this.emModal) {
      // Reutiliza o mesmo formulário para cadastrar (vazio) e editar (preenchido).
      if (this.entradaParaEditar) {
        this.preencherFormulario(this.entradaParaEditar);
      }
      return;
    }

    // Mantém a compatibilidade com as rotas /new e /edit/:id.
    const parametro = this.route.snapshot.paramMap.get('id');
    if (parametro === null) return;

    const id = Number(parametro);
    if (!Number.isSafeInteger(id) || id <= 0) {
      this.mensagemErro = 'ID da entrada inválido.';
      return;
    }

    this.modoEdicao = true;
    this.idEntrada = id;

    // O backend não tem findById: pesquisa no retorno de findAll.
    this.api.findAll().subscribe({
      next: registros => {
        const encontrado = registros.find(item => item.id === id);
        if (encontrado) this.preencherFormulario(encontrado);
        else this.mensagemErro = 'Entrada não encontrada no banco de dados.';
      },
      error: erro => {
        console.error(erro);
        this.mensagemErro = 'Não foi possível carregar a entrada do servidor.';
      }
    });
  }

  private preencherFormulario(item: Entrada): void {
    this.modoEdicao = true;
    this.idEntrada = item.id;
    this.nomeEntrada = item.nomeEntrada;
    this.valor = item.valor;
  }

  cancelar(): void {
    if (this.salvando) return;
    if (this.emModal) this.cancelado.emit();
    else void this.router.navigate(['/otc/entradas']);
  }

  salvar(): void {
    if (this.salvando) return;
    this.mensagemErro = '';

    const nome = this.nomeEntrada.trim();
    const numero = Number(this.valor);
    if (!nome) {
      this.mensagemErro = 'Informe o nome da entrada.';
      return;
    }
    if (nome.length > 255) {
      this.mensagemErro = 'O nome deve ter no máximo 255 caracteres.';
      return;
    }
    if (this.valor === null || !Number.isFinite(numero) || numero < 0.01) {
      this.mensagemErro = 'Informe um valor maior ou igual a R$ 0,01.';
      return;
    }
    const centavos = numero * 100;
    if (Math.abs(centavos - Math.round(centavos)) > 0.000001) {
      this.mensagemErro = 'O valor deve ter no máximo duas casas decimais.';
      return;
    }
    const dados = { nomeEntrada: nome, valor: Math.round(centavos) / 100 };
    if (this.modoEdicao && this.idEntrada === null) {
      this.mensagemErro = 'Não foi possível identificar o registro para editar.';
      return;
    }

    this.salvando = true;
    const requisicao = this.modoEdicao
      ? this.api.updateById(this.idEntrada!, dados)
      : this.api.save(dados);

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        if (this.emModal) this.salvo.emit();
        else void this.router.navigate(['/otc/entradas']);
      },
      error: (erro: HttpErrorResponse) => {
        console.error('Erro na API de entradas:', erro);
        this.salvando = false;
        this.mensagemErro = erro.status === 0
          ? 'Não foi possível conectar ao Spring Boot. Verifique se ele está ligado e o CORS.'
          : erro.status === 400
          ? 'Dados rejeitados pelo servidor. Confira o nome e o valor.'
          : 'Não foi possível salvar. Tente novamente.';
      }
    });
  }
}
