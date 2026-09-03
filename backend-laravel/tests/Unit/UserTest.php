<?php

namespace Tests\Unit;

use App\Models\User;
use PHPUnit\Framework\TestCase;

class UserTest extends TestCase
{
    public function test_get_auth_password_name_returns_correct_column()
    {
        $user = new User;
        $this->assertEquals('password_hash', $user->getAuthPasswordName());
    }
}
