import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByKeycloakId(keycloakId: string): Promise<User | null> {
    return this.findOne({ where: { keycloak_id: keycloakId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ where: { email } });
  }

  async findByCellId(cellId: string): Promise<User[]> {
    return this.find({
      where: { cell_id: cellId, is_deleted: false },
      relations: ["cell"],
    });
  }
}
