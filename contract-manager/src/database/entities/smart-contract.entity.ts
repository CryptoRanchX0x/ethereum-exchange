import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('smart_contract')
@Index(['name'])
@Index(['id_abi'])
@Index(['ativo'])
@Index(['address'], { unique: true })
@Index(['tx_hash'], { unique: true })
export class SmartContractEntity {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('char', { length: 42 })
  address: string;

  @Column('char', { length: 66 })
  tx_hash: string;

  @Column('char', { length: 36 })
  id_abi: string;

  @Column('boolean', { default: true })
  ativo: boolean;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
