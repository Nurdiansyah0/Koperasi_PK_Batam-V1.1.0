<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Models\User;

class UserTest extends TestCase
{
    public function test_get_auth_password_name_returns_correct_column()
    {
        $user = new User();
        $this->assertEquals('password_hash', $user->getAuthPasswordName());
    }
}
