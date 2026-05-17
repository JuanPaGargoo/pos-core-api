import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Doctor, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeDoctorStatusDto,
  CreateDoctorDto,
  PaginationQueryDto,
  UpdateDoctorDto,
} from './dto';

function mapDoctor(d: Doctor) {
  return {
    id: d.id,
    name: d.name,
    license: d.license,
    specialty: d.specialty,
    phone: d.phone,
    email: d.email,
    isActive: d.isActive,
  };
}

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDoctors(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const skip = (page - 1) * limit;

    const where: Prisma.DoctorWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { license: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    return { data: doctors.map(mapDoctor), meta: { page, limit, total } };
  }

  async createDoctor(dto: CreateDoctorDto) {
    const existing = await this.prisma.doctor.findFirst({
      where: { license: dto.license },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe un médico con la cédula "${dto.license}"`,
      );
    }

    const doctor = await this.prisma.doctor.create({
      data: {
        name: dto.name,
        license: dto.license,
        specialty: dto.specialty,
        phone: dto.phone,
        email: dto.email,
        isActive: dto.isActive ?? true,
      },
    });

    return { data: mapDoctor(doctor), meta: {} };
  }

  async updateDoctor(id: number, dto: UpdateDoctorDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }

    if (dto.license && dto.license !== doctor.license) {
      const conflict = await this.prisma.doctor.findFirst({
        where: { license: dto.license, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Ya existe un médico con la cédula "${dto.license}"`,
        );
      }
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.license !== undefined && { license: dto.license }),
        ...(dto.specialty !== undefined && { specialty: dto.specialty }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
      },
    });

    return { data: mapDoctor(updated), meta: {} };
  }

  async changeStatus(id: number, dto: ChangeDoctorStatusDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) {
      throw new NotFoundException(`Médico con id ${id} no encontrado`);
    }

    const updated = await this.prisma.doctor.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    return { data: mapDoctor(updated), meta: {} };
  }
}
