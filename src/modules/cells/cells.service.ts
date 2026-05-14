import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cell } from "./entities/cell.entity";
import { CreateCellDto } from "./dto/create-cell.dto";
import { UpdateCellDto } from "./dto/update-cell.dto";

@Injectable()
export class CellsService {
  constructor(
    @InjectRepository(Cell)
    private cellsRepository: Repository<Cell>,
  ) {}

  async create(createCellDto: CreateCellDto): Promise<Cell> {
    const cell = this.cellsRepository.create(createCellDto);
    return this.cellsRepository.save(cell);
  }

  async findAll(): Promise<Cell[]> {
    return this.cellsRepository.find({
      where: { is_deleted: false },
      order: { created_at: "DESC" },
    });
  }

  async findOne(id: string): Promise<Cell> {
    const cell = await this.cellsRepository.findOne({
      where: { id, is_deleted: false },
      relations: ["users"],
    });

    if (!cell) {
      throw new NotFoundException(`Cell with ID ${id} not found`);
    }

    return cell;
  }

  async update(id: string, updateCellDto: UpdateCellDto): Promise<Cell> {
    const cell = await this.findOne(id);
    Object.assign(cell, updateCellDto);
    return this.cellsRepository.save(cell);
  }

  async remove(id: string): Promise<void> {
    const cell = await this.findOne(id);
    cell.is_deleted = true;
    await this.cellsRepository.save(cell);
  }
}
