import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDTO } from './dto/create-user.dto';
import {
  ERROR_OCCURED,
  FAILED_TO_CREATE_USER,
  USER_ACCOUNT_EXIST,
  USER_CREATED_SUCCESSFULLY,
} from '../../helpers/SystemMessages';
import { JwtService } from '@nestjs/jwt';
import UserService from '../user/user.service';
import { compare } from 'bcrypt';

@Injectable()
export default class AuthenticationService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  async createNewUser(creatUserDto: CreateUserDTO) {
    try {
      const userExists = await this.userService.getUserRecord({
        identifier: creatUserDto.email,
        identifierType: 'email',
      });

      if (userExists) {
        return {
          status_code: HttpStatus.BAD_REQUEST,
          message: USER_ACCOUNT_EXIST,
        };
      }

      await this.userService.createUser(creatUserDto);

      const user = await this.userService.getUserRecord({ identifier: creatUserDto.email, identifierType: 'email' });

      if (!user) {
        return {
          status_code: HttpStatus.BAD_REQUEST,
          message: FAILED_TO_CREATE_USER,
        };
      }

      const accessToken = this.jwtService.sign({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        sub: user.id,
      });

      const responsePayload = {
        token: accessToken,
        user: {
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          created_at: user.created_at,
        },
      };

      return {
        status_code: HttpStatus.CREATED,
        message: USER_CREATED_SUCCESSFULLY,
        data: responsePayload,
      };
    } catch (createNewUserError) {
      Logger.log('AuthenticationServiceError ~ createNewUserError ~', createNewUserError);
      throw new HttpException(
        {
          message: ERROR_OCCURED,
          status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async loginUser(body: any) {
    try {
      const userExists = await this.userService.getUserRecord({
        identifier: body.email,
        identifierType: 'email',
      });

      if (!userExists) {
        return {
          status_code: HttpStatus.NOT_FOUND,
          message: 'User not found',
        };
      }

      // Verify password
      const isPasswordValid = await compare(body.password, userExists.password);
      if (!isPasswordValid) {
        return {
          status_code: HttpStatus.UNAUTHORIZED,
          message: 'Invalid credentials',
        };
      }

      // Generate JWT token
      const accessToken = this.jwtService.sign({
        email: userExists.email,
        first_name: userExists.first_name,
        last_name: userExists.last_name,
        sub: userExists.id,
      });

      const responsePayload = {
        token: accessToken,
        user: {
          first_name: userExists.first_name,
          last_name: userExists.last_name,
          email: userExists.email,
          created_at: userExists.created_at,
        },
      };

      return {
        status_code: HttpStatus.OK,
        message: 'Login successful',
        data: responsePayload,
      };
    } catch (loginUserError) {
      Logger.log('AuthenticationServiceError ~ loginUserError ~', loginUserError);
      console.log(`${loginUserError}`);

      throw new HttpException(
        {
          message: ERROR_OCCURED,
          status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
