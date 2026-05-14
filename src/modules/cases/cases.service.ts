import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Case } from "./entities/case.entity";
import { CaseFilterDto } from "./dto/case-filter.dto";

@Injectable()
export class CasesService {
  constructor(
    @InjectRepository(Case)
    private casesRepository: Repository<Case>,
  ) {}

  async findAll(filters?: CaseFilterDto): Promise<Case[]> {
    const query = this.casesRepository
      .createQueryBuilder("case")
      .where("case.is_deleted = :isDeleted", { isDeleted: false })
      .leftJoinAndSelect("case.cell", "cell");

    if (filters?.cell_id) {
      query.andWhere("case.cell_id = :cellId", { cellId: filters.cell_id });
    }

    if (filters?.stage) {
      query.andWhere("case.stage = :stage", { stage: filters.stage });
    }

    if (filters?.status) {
      query.andWhere("case.status = :status", { status: filters.status });
    }

    if (filters?.vertical) {
      query.andWhere("case.vertical = :vertical", {
        vertical: filters.vertical,
      });
    }

    if (filters?.client_name) {
      query.andWhere("case.client_name ILIKE :clientName", {
        clientName: `%${filters.client_name}%`,
      });
    }

    query.orderBy("case.created_at", "DESC");

    return query.getMany();
  }

  async findOne(id: string): Promise<Case> {
    const caseEntity = await this.casesRepository.findOne({
      where: { id, is_deleted: false },
      relations: ["cell"],
    });

    if (!caseEntity) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    return caseEntity;
  }

  async findByCellIds(cellIds: string[]): Promise<Case[]> {
    return this.casesRepository
      .createQueryBuilder("case")
      .where("case.is_deleted = :isDeleted", { isDeleted: false })
      .andWhere("case.cell_id IN (:...cellIds)", { cellIds })
      .leftJoinAndSelect("case.cell", "cell")
      .orderBy("case.created_at", "DESC")
      .getMany();
  }
}
