import { Component, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginService } from './login.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  mode = signal<'login' | 'register'>('login');
  submitting = signal(false);
  statusMessage = signal('');

  // Output event to parent
  loginSuccess = output<any>();

  readonly form: FormGroup;

  constructor(private readonly fb: FormBuilder, private readonly loginService: LoginService) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: [''],
    });
  }

  switchMode(mode: 'login' | 'register'): void {
    this.mode.set(mode);
    this.statusMessage.set('');
    if (mode === 'register') {
      this.form.get('confirmPassword')?.addValidators([Validators.required]);
    } else {
      this.form.get('confirmPassword')?.clearValidators();
      this.form.get('confirmPassword')?.setValue('');
    }
    this.form.get('confirmPassword')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password, confirmPassword } = this.form.value;

    if (this.mode() === 'register' && password !== confirmPassword) {
      this.statusMessage.set('Passwords must match.');
      return;
    }

    this.submitting.set(true);
    this.statusMessage.set('');

    const request$ = this.mode() === 'login'
      ? this.loginService.login(username!, password!)
      : this.loginService.register(username!, password!);

    request$.subscribe({
      next: (response: any) => {
        if(response.success || response.token) {
           // Pass the whole user object up including ELO and Token
           // Assuming response contains: { success: true, username: '...', elo: 100, ... }
           this.loginSuccess.emit(response);
        } else {
           this.statusMessage.set(response.message || 'Authentication failed');
        }
      },
      error: (err) => {
        this.statusMessage.set(err?.error?.message || 'Server error');
        this.submitting.set(false);
      },
      complete: () => this.submitting.set(false),
    });
  }
}
