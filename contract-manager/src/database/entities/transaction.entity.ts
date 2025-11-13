import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { SmartContractEntity } from './smart-contract.entity';

export enum TransactionStatus {
  ENVIADA = 'ENVIADA',
  PENDENTE = 'PENDENTE',
  CONCLUIDA = 'CONCLUIDA',
  ERROR = 'ERROR',
}

@Entity('transactions')
@Index(['id_smart_contract'])
@Index(['status'])
@Index(['function_name'])
@Index(['tx_hash'], { unique: true })
export class TransactionEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column('char', { length: 36 })
  id_smart_contract: string;

  @Column('char', { length: 66 })
  tx_hash: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.ENVIADA,
  })
  status: TransactionStatus;

  @Column('varchar', { length: 100 })
  function_name: string;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;

  @ManyToOne(() => SmartContractEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_smart_contract' })
  smartContract: SmartContractEntity;
}
